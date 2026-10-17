import bcrypt from "bcryptjs";

const COST = 10;

// Compared against when an email is unknown so response time does not reveal it.
const DUMMY_HASH = bcrypt.hashSync("orbit-timing-equaliser", COST);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(
  password: string,
  hash: string | null,
): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH).then((ok) => ok && hash !== null);
}
