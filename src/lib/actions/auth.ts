"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

async function ensureUsers() {
  const count = await prisma.user.count();
  if (count > 0) return;

  const admin = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
  const readOnly = {
    username: process.env.READONLY_USERNAME || "readonly",
    password: process.env.READONLY_PASSWORD || "readonly123",
  };

  await prisma.user.createMany({
    data: [
      {
        username: admin.username,
        passwordHash: await bcrypt.hash(admin.password, 10),
        role: "ADMIN",
      },
      {
        username: readOnly.username,
        passwordHash: await bcrypt.hash(readOnly.password, 10),
        role: "READ_ONLY",
      },
    ],
  });
}

export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password" };
  }

  await ensureUsers();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid username or password" };
  }

  await createSession({ userId: user.id, username: user.username, role: user.role });
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
