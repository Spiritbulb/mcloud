import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
    session: {
        cookie: {
            domain: process.env.NODE_ENV === 'production' ? '.menengai.cloud' : 'localhost',
        }
    }
});
