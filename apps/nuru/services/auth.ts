import { User } from '@/types';
import { delay, id, rand } from './client';

let session: User | null = null;

export const auth = {
  async login(email: string, _password: string): Promise<User> {
    await delay(rand(400, 800));
    session = { id: id(), name: email.split('@')[0] || 'Student', email };
    return session;
  },
  async signup(name: string, email: string, _password: string): Promise<User> {
    await delay(rand(400, 800));
    session = { id: id(), name: name || 'Student', email };
    return session;
  },
  async getSession(): Promise<User | null> {
    await delay(200);
    return session;
  },
  async logout(): Promise<void> {
    await delay(200);
    session = null;
  },
};
