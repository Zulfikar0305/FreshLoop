import { createContext, useContext } from 'react';

export const SignOutContext = createContext<() => void>(() => {});
export const useSignOut = () => useContext(SignOutContext);
