import { Router } from "express";
import { db, pool } from "../storage";
import { sql } from "drizzle-orm";
import { requireAdmin, hashPassword, type Session } from "./auth-utils";
import crypto from "crypto";

export const laundromatRouter = Router();

function requireSuperAdmin(req: any, res: any, next: any): void {
  const user = req.adminUser as Session | undefined;
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    res.status(403).json({ message: "Forbidden: super_admin access required" });
    return;
  }
  next();
}

// ── GET /api/laundromats — list all (super_admin / admin only) ──
laundromatRouter.get("/api/laundromats", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, owner_user_id, address_line1, city, state, zip,
              lat, lng, service_radius_miles, certified, active,
              accepts_standard, accepts_signature, accepts_custom,
              signature_premium_cents, capacity_bags_per_day, hours_json,
              created_at, updated_at
       FROM laundromats
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/laundromats — create laundromat + optional owner ──
laundromatRouter.post("/api/laundromats", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      address_line1,
      city,
      state,
      zip,
      lat,
      lng,
      service_radius_miles = 10,
      capacity_bags_per_day = 100,
      owner_email,
      owner_name,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const id = crypto.randomUUID();

    // If owner email provided, create or find user
    let ownerUserId: number | null = null;
    let tempPassword: string | null = null;

    if (owner_email) {
      const existing = await pool.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [owner_email]
      );
      if (existing.rows.length > 0) {
        ownerUserId = existing.rows[0].id;
        await pool.query(
          `UPDATE users SET role = 'laundromat_owner' WHERE id = $1`,
          [ownerUserId]
        );
      } else {
        tempPassword = crypto.randomBytes(8).toString("hex");
        const hashedPw = await hashPassword(tempPassword);
        const username = owner_email.split("@")[0] + "_" + Date.now();
        const newUser = await pool.query(
          `INSERT INTO users (username, email, name, password, role)
           VALUES ($1, $2, $3, $4, 'laundromat_owner')
           RETURNING id`,
          [username, owner_email, owner_name || "", hashedPw]
        );
        ownerUserId = newUser.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO laundromats (id, name, owner_user_id, address_line1, city, state, zip, lat, lng, service_radius_miles, capacity_bags_per_day)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, name.trim(), ownerUserId, address_line1 || null, city || null, state || null, zip || null, lat || null, lng || null, service_radius_miles, capacity_bags_per_day]
    );

    const laundromat = result.rows[0];

    res.status(201).json({
      ...laundromat,
      ...(tempPassword ? { owner_temp_password: tempPassword } : {}),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/laundromats/:id — update (certify/uncertify/activate/deactivate/edit) ──
laundromatRouter.patch("/api/laundromats/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "name", "address_line1", "city", "state", "zip",
      "lat", "lng", "service_radius_miles", "certified", "active",
      "accepts_standard", "accepts_signature", "accepts_custom",
      "signature_premium_cents", "capacity_bags_per_day", "hours_json",
      "owner_user_id",
    ];

    const setClauses: string[] = [];
    const values: any[] = [id];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        values.push(value);
        setClauses.push(`${key} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    setClauses.push(`updated_at = NOW()`);

    const query = `UPDATE laundromats SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Laundromat not found" });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
