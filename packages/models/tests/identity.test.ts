/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { IdentityModel } from '../src/identity';
import { mapIdentityDbObject } from '../src/identity/access-patterns';
import { Identity } from '../src/identity/types';
import { ValidationError, NotFoundError } from '../src/errors';

const existingIdentityMock: Identity = {
  address: '0x0b015d4e6b3f0aeea975efa7287d3daadd0c',
  publicKey:
    '080112200c0f5e55f4f32af31bf39e1a3703adee3d0141f84f752c1a6522fb358f9c3ac8',
  username: 'test-user',
  createdAt: '2020-06-18T21:04:48.141Z',
};
describe('IdentityModel', () => {
  let identityModel: IdentityModel;

  beforeEach(() => {
    identityModel = new IdentityModel('test');
  });

  describe('createIdentity', () => {
    it('fails if the username is taken', async () => {
      identityModel.getIdentityByUsername = () =>
        Promise.resolve(existingIdentityMock);
      identityModel.getIdentityByAddress = () =>
        Promise.reject(new NotFoundError(''));

      const testCreateIdentity = () =>
        identityModel.createIdentity(existingIdentityMock);
      await expect(testCreateIdentity()).rejects.toThrow(
        new ValidationError(
          'An identity with the given username already exists'
        )
      );
    });

    it('fails if the address is taken', async () => {
      identityModel.getIdentityByAddress = () =>
        Promise.resolve(existingIdentityMock);
      identityModel.getIdentityByUsername = () =>
        Promise.reject(new NotFoundError(''));

      const testCreateIdentity = () =>
        identityModel.createIdentity(existingIdentityMock);
      await expect(testCreateIdentity()).rejects.toThrow(
        new ValidationError('An identity with the given address already exists')
      );
    });

    it('creates an identity', async () => {
      identityModel.getIdentityByAddress = () =>
        Promise.reject(new NotFoundError(''));
      identityModel.getIdentityByUsername = () =>
        Promise.reject(new NotFoundError(''));
      // @ts-ignore
      identityModel.put = jest.fn(() => Promise.resolve(null));

      await identityModel.createIdentity(existingIdentityMock);

      // @ts-ignore
      expect(identityModel.put).toHaveBeenCalled();
      // @ts-ignore
      const createdIdentity = identityModel.put.mock.calls[0][0];
      delete createdIdentity.createdAt;
      expect(createdIdentity).toMatchSnapshot();
    });
  });

  describe('getIdentityByAddress', () => {
    it('returns an error if the identity cannot be found', async () => {
      // @ts-ignore
      identityModel.query = () => Promise.resolve({ Items: [] });

      const testGetIdentity = () => identityModel.getIdentityByAddress('0x123');
      await expect(testGetIdentity()).rejects.toThrow(
        new NotFoundError('Identity with address 0x123 not found.')
      );
    });

    it('returns an identity if found', async () => {
      // @ts-ignore
      identityModel.query = () =>
        Promise.resolve({ Items: [mapIdentityDbObject(existingIdentityMock)] });

      const testGetIdentity = () => identityModel.getIdentityByAddress('0x123');
      await expect(testGetIdentity()).resolves.toEqual(existingIdentityMock);
    });
  });

  describe('getIdentityByAddress', () => {
    it('returns an error if the identity cannot be found', async () => {
      // @ts-ignore
      identityModel.query = () => Promise.resolve({ Items: [] });

      const testGetIdentity = () => identityModel.getIdentityByAddress('0x123');
      await expect(testGetIdentity()).rejects.toThrow(
        new NotFoundError('Identity with address 0x123 not found.')
      );
    });

    it('returns an identity if found', async () => {
      // @ts-ignore
      identityModel.query = () =>
        Promise.resolve({ Items: [mapIdentityDbObject(existingIdentityMock)] });

      const testGetIdentity = () => identityModel.getIdentityByAddress('0x123');
      await expect(testGetIdentity()).resolves.toEqual(existingIdentityMock);
    });
  });

  describe('getIdentityByUsername', () => {
    it('returns an error if the identity cannot be found', async () => {
      // @ts-ignore
      identityModel.getItem = () => Promise.resolve({});

      const testGetIdentity = () =>
        identityModel.getIdentityByUsername('test-user');
      await expect(testGetIdentity()).rejects.toThrow(
        new NotFoundError('Identity with username test-user not found.')
      );
    });

    it('returns an identity if found', async () => {
      // @ts-ignore
      identityModel.getItem = () =>
        Promise.resolve({ Item: mapIdentityDbObject(existingIdentityMock) });

      const testGetIdentity = () =>
        identityModel.getIdentityByUsername('test-user');
      await expect(testGetIdentity()).resolves.toEqual(existingIdentityMock);
    });
  });
});
