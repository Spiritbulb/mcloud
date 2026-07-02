import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { User } from '@/types';
import { auth } from '@/services/auth';

type Ctx = { user: User | null; loading: boolean; setUser: (u: User | null) => void };
const SessionContext = createContext<Ctx>({ user: null, loading: true, setUser: () => {} });

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    auth.getSession().then((u) => { setUser(u); setLoading(false); });
  }, []);
  return (
    <SessionContext.Provider value={{ user, loading, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
