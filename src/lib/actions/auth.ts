"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { verifySession } from "@/lib/auth";

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

export async function changePassword(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await verifySession();
  if (!session) return { error: "You must be signed in to do this." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Fill in all fields" };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect" };
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return { error: "New password must be different from the current one" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });

  return { success: true };
}
