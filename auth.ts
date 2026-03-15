import NextAuth, { CredentialsSignin, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "./Client";
import bcrypt from "bcryptjs";

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

//get users func
async function getUser(email: string): Promise<User | any> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user");
  }
}

const authConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        }
      },

      async authorize(credentials) {
        const parsedCredential = UserSchema.safeParse(credentials);
        if (!parsedCredential.success) {
          throw new CredentialsSignin({
            cause: "Invalid input"
          })
        }
        const { email, password } = parsedCredential.data;
        const user = await getUser(email);
        if (!user) {
          throw new CredentialsSignin({
            cause: "User doesn't exists"
          })
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          throw new CredentialsSignin({
            cause: "Incorrect password"
          })
        }
        return {
          id: user.id,
          email: user.email,
          name: user.username,
        };
      }
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        console.log("token created")
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }: { auth: any; request: any }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard && !isLoggedIn) {
        return false;
      }
      return true;
    }
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60
  },
};

// Wrap NextAuth initialization in a try-catch so it doesn't crash at build time
// when environment variables (AUTH_SECRET, DATABASE_URL) are not available
let handlers: any;
let signIn: any;
let signOut: any;
let auth: any;

try {
  const result = NextAuth(authConfig);
  handlers = result.handlers;
  signIn = result.signIn;
  signOut = result.signOut;
  auth = result.auth;
} catch (error) {
  console.error("NextAuth initialization failed (likely missing env vars during build):", error);
  // Provide dummy exports so the build doesn't crash
  handlers = { GET: () => new Response("Auth not configured", { status: 500 }), POST: () => new Response("Auth not configured", { status: 500 }) };
  signIn = async () => { throw new Error("Auth not configured"); };
  signOut = async () => { throw new Error("Auth not configured"); };
  auth = async () => null;
}

export { handlers, signIn, signOut, auth };
