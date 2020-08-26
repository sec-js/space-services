import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SignatureModel, IdentityModel, NotFoundError } from '@packages/models';
import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import { defer } from 'rxjs';
import { retryWhen, delay, take, switchMap } from 'rxjs/operators';
import multibase from 'multibase';
import { createTextileClient, getAPISig } from './utils';

(global as any).WebSocket = require('isomorphic-ws');

interface TokenRequestPayload {
  data: {
    pubkey: string;
  };
}

interface AuthContext {
  uuid: string;
  pubkey: string;
}

const STAGE = process.env.ENV;
const { JWT_SECRET } = process.env;

const sigDb = new SignatureModel(STAGE);
const identityDb = new IdentityModel(STAGE);

const apig = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.APIG_ENDPOINT,
});

const sendMessageToClient = (
  connectionId: string,
  payload: object
): Promise<object> =>
  apig
    .postToConnection({
      ConnectionId: connectionId, // connectionId of the receiving ws-client
      Data: JSON.stringify(payload),
    })
    .promise();

const findChallengeAnswer = (pubkey: string): Promise<Buffer> => {
  const source = defer(() => sigDb.getSignatureByPublicKey(pubkey));

  return source
    .pipe(
      switchMap(async row => {
        try {
          await sigDb.deleteSignatureByPublicKey(row.publicKey);
        } catch (e) {
          console.log('error on row removal');
          console.log(e);
        }

        return multibase.decode(row.signature);
      }),
      retryWhen(errors => errors.pipe(delay(1000), take(15)))
    )
    .toPromise();
};

// eslint-disable-next-line
export const handler = async function(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const {
    body,
    requestContext: { connectionId },
  } = event;

  const {
    data: { pubkey },
  } = JSON.parse(body) as TokenRequestPayload;

  if (!pubkey) {
    console.log('missing pubkey param');
    throw new Error('Missing pubkey param');
  }

  const client = await createTextileClient();

  // Multibase (lib used by textile identities) prepends the public key with a "code"
  // https://github.com/multiformats/js-multibase
  const token = await client.getTokenChallenge(
    pubkey,
    async (challenge: Uint8Array) => {
      const value = Buffer.from(challenge).toJSON();
      const challengePayload = {
        type: 'challenge',
        value,
      };

      // Send message to client and wait for an answer in sync
      await sendMessageToClient(connectionId, challengePayload);

      return findChallengeAnswer(pubkey);
    }
  );

  const hexPubKey = multibase
    .decode(pubkey)
    .toString('hex')
    .substr(-64);

  const user = await identityDb.getIdentityByPublicKey(hexPubKey).catch(e => {
    if (e instanceof NotFoundError) {
      return identityDb.createIdentity({
        publicKey: hexPubKey,
      });
    }

    throw e;
  });

  const authPayload: AuthContext = {
    pubkey: hexPubKey,
    uuid: user.uuid,
  };

  const appToken = jwt.sign(authPayload, JWT_SECRET, {
    expiresIn: '30d',
  });

  const auth = await getAPISig(24 * 3600);

  const payload = {
    ...auth,
    token,
    key: process.env.TXL_USER_KEY,
    appToken,
  };

  await sendMessageToClient(connectionId, {
    type: 'token',
    value: payload,
  });

  return { statusCode: 200, body: '' };
};
