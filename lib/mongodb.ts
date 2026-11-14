import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

export interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Повертає кешоване з'єднання з MongoDB для безпечної роботи у Serverless-середовищі (Vercel).
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('Критична помилка: Змінна оточення MONGODB_URI не задана у .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
