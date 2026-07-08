import bcrypt from "bcryptjs";
import { query, withTransaction } from "../config/db.js";

const DEMO_PASSWORD = "Password123!";

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    truckId: row.truck_id || null,
    truckNumber: row.truck_number || null,
    plateNumber: row.plate_number || null,
    truckStatus: row.truck_status || null
  };
}

function mapTruck(row) {
  if (!row) return null;
  return {
    id: row.id,
    truckNumber: row.truck_number,
    plateNumber: row.plate_number,
    capacity: row.capacity,
    type: row.truck_type,
    truckType: row.truck_type,
    driverId: row.driver_id,
    driver: row.driver_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCargoRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    customer: row.customer_name,
    pickup: row.pickup,
    destination: row.destination,
    from: row.pickup,
    to: row.destination,
    truckType: row.truck_type,
    weight: row.weight,
    description: row.description,
    cargo: row.description,
    receiver: row.receiver,
    sender: row.sender,
    specialInstructions: row.special_instructions,
    status: row.status,
    driverId: row.driver_id,
    driver: row.driver_name,
    truckId: row.truck_id,
    truck: row.truck_number,
    dispatcherId: row.dispatcher_id,
    dispatcher: row.dispatcher_name,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTrip(row) {
  if (!row) return null;
  return {
    id: row.id,
    cargoRequestId: row.cargo_request_id,
    customerId: row.customer_id,
    customer: row.customer_name,
    driverId: row.driver_id,
    driver: row.driver_name,
    dispatcherId: row.dispatcher_id,
    dispatcher: row.dispatcher_name,
    truckId: row.truck_id,
    truck: row.truck_number,
    pickup: row.pickup,
    destination: row.destination,
    route: `${row.pickup} -> ${row.destination}`,
    distance: row.distance,
    estimatedTime: row.estimated_time,
    eta: row.estimated_time,
    status: row.status,
    fare: Number(row.fare || 0),
    cargo: row.description || row.cargo_description || "Cargo",
    deliveryProofUrl: row.delivery_proof_url,
    signatureUrl: row.signature_url,
    lastLocation:
      row.last_lat != null
        ? { lat: row.last_lat, lng: row.last_lng, updatedAt: row.last_location_at }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    message: row.message,
    read: row.read,
    createdAt: row.created_at
  };
}

async function createNotification(clientOrNull, { userId = null, type, message }) {
  const runner = clientOrNull || { query };
  const result = await runner.query(
    `INSERT INTO notifications (user_id, type, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, type, message]
  );
  return mapNotification(result.rows[0]);
}

async function writeAudit(client, { actorId = null, action, entity = null, entityId = null, meta = {} }) {
  await client.query(
    `INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entity, entityId, JSON.stringify(meta)]
  );
}

export const db = {
  async seedIfEmpty() {
    const existing = await query("SELECT COUNT(*)::int AS count FROM users");
    if (existing.rows[0].count > 0) return { seeded: false };

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    await withTransaction(async (client) => {
      const roles = [
        ["System Admin", "admin@truckdispatch.local", "admin", "+10000000001"],
        ["Alex Thompson", "dispatcher@truckdispatch.local", "dispatcher", "+10000000002"],
        ["Retail Solutions", "customer@truckdispatch.local", "customer", "+10000000003"],
        ["Mike Driver", "driver@truckdispatch.local", "driver", "+10000000004"],
        ["Sarah Miller", "driver2@truckdispatch.local", "driver", "+10000000005"],
        ["Robert Brown", "driver3@truckdispatch.local", "driver", "+10000000006"]
      ];

      const userIds = {};
      for (const [name, email, role, phone] of roles) {
        const result = await client.query(
          `INSERT INTO users (name, email, password_hash, role, phone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, role, email`,
          [name, email, passwordHash, role, phone]
        );
        userIds[email] = result.rows[0].id;
      }

      for (const name of ["Box Truck", "Flatbed", "Refrigerated", "Tanker"]) {
        await client.query(
          `INSERT INTO truck_types (name, description)
           VALUES ($1, $2)
           ON CONFLICT (name) DO NOTHING`,
          [name, `${name} category`]
        );
      }

      const truckDefs = [
        ["Freightliner #82", "TX-82-LC", "12 tons", "Box Truck", "driver@truckdispatch.local", "Busy"],
        ["Peterbilt #45", "GA-45-FL", "18 tons", "Flatbed", "driver2@truckdispatch.local", "Available"],
        ["Kenworth #12", "AZ-12-KW", "10 tons", "Refrigerated", "driver3@truckdispatch.local", "Maintenance"]
      ];

      const truckIds = {};
      for (const [truckNumber, plate, capacity, type, email, status] of truckDefs) {
        const result = await client.query(
          `INSERT INTO trucks (truck_number, plate_number, capacity, truck_type, driver_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, truck_number`,
          [truckNumber, plate, capacity, type, userIds[email], status]
        );
        truckIds[email] = result.rows[0];
      }

      const customerId = userIds["customer@truckdispatch.local"];
      const dispatcherId = userIds["dispatcher@truckdispatch.local"];
      const driver1 = userIds["driver@truckdispatch.local"];
      const driver2 = userIds["driver2@truckdispatch.local"];

      const requests = [
        ["REQ-9012", "New York", "Chicago", "Box Truck", "1.4 tons", "Electronics", "Pending"],
        ["REQ-9013", "Dallas", "Houston", "Flatbed", "2.1 tons", "Furniture", "Pending"],
        ["REQ-9014", "Atlanta", "Miami", "Refrigerated", "4.0 tons", "Beverages", "Pending"],
        ["REQ-9015", "Seattle", "Portland", "Box Truck", "0.8 tons", "Food Items", "Assigned"]
      ];

      for (const [id, pickup, destination, truckType, weight, description, status] of requests) {
        await client.query(
          `INSERT INTO cargo_requests
            (id, customer_id, pickup, destination, truck_type, weight, description, sender, receiver, status, driver_id, truck_id, dispatcher_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            id,
            customerId,
            pickup,
            destination,
            truckType,
            weight,
            description,
            "Retail Solutions",
            "Warehouse Desk",
            status,
            status === "Assigned" ? driver2 : null,
            status === "Assigned" ? truckIds["driver2@truckdispatch.local"].id : null,
            status === "Assigned" ? dispatcherId : null
          ]
        );
      }

      await client.query(
        `INSERT INTO trips
          (id, cargo_request_id, customer_id, driver_id, dispatcher_id, truck_id, pickup, destination, distance, estimated_time, status, fare, last_lat, last_lng, last_location_at)
         VALUES
          ('SHP-1001', NULL, $1, $2, $3, $4, 'Chicago, IL', 'Houston, TX', '1,084 mi', '18h 45m', 'In Transit', 2450, 41.5, -87.6, NOW()),
          ('SHP-1003', NULL, $1, $5, $3, $6, 'Atlanta, GA', 'Miami, FL', '662 mi', '10h 20m', 'Delayed', 1890, 25.7, -80.2, NOW()),
          ('SHP-10294', 'REQ-9015', $1, $5, $3, $6, 'Chicago, IL', 'New York, NY', '790 mi', '12h 30m', 'In Transit', 2100, 41.4, -81.7, NOW())`,
        [
          customerId,
          driver1,
          dispatcherId,
          truckIds["driver@truckdispatch.local"].id,
          driver2,
          truckIds["driver2@truckdispatch.local"].id
        ]
      );

      await client.query(
        `INSERT INTO payments (trip_id, customer_id, amount, status, method)
         VALUES
           ('SHP-1001', $1, 2450, 'Paid', 'card'),
           ('SHP-1003', $1, 1890, 'Pending', 'card'),
           ('SHP-10294', $1, 2100, 'Paid', 'card')`,
        [customerId]
      );

      await client.query(
        `INSERT INTO settings (key, value)
         VALUES
           ('general', '{"companyName":"TruckDispatch","supportEmail":"support@truckdispatch.local","currency":"USD"}'::jsonb),
           ('notifications', '{"email":true,"sms":false,"push":true}'::jsonb)
         ON CONFLICT (key) DO NOTHING`
      );

      await createNotification(client, {
        userId: dispatcherId,
        type: "order.created",
        message: "New cargo request REQ-9012 created"
      });
      await createNotification(client, {
        userId: driver1,
        type: "driver.assigned",
        message: "SHP-1001 assigned to Mike Driver"
      });
      await createNotification(client, {
        userId: customerId,
        type: "cargo.delivered",
        message: "Previous shipment delivered successfully"
      });
    });

    return { seeded: true, demoPassword: DEMO_PASSWORD };
  },

  async findUserByEmail(email) {
    const result = await query(
      `SELECT u.*, t.id AS truck_id, t.truck_number, t.plate_number, t.status AS truck_status
       FROM users u
       LEFT JOIN trucks t ON t.driver_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ...mapUser(row), passwordHash: row.password_hash };
  },

  async findUserById(id) {
    const result = await query(
      `SELECT u.*, t.id AS truck_id, t.truck_number, t.plate_number, t.status AS truck_status
       FROM users u
       LEFT JOIN trucks t ON t.driver_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    return mapUser(result.rows[0]);
  },

  async listUsers({ role, search, page = 1, limit = 50 } = {}) {
    const clauses = [];
    const params = [];
    if (role) {
      params.push(role);
      clauses.push(`u.role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);
    const result = await query(
      `SELECT u.*, t.id AS truck_id, t.truck_number, t.plate_number, t.status AS truck_status
       FROM users u
       LEFT JOIN trucks t ON t.driver_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM users u ${where}`,
      params.slice(0, params.length - 2)
    );
    return { data: result.rows.map(mapUser), total: countResult.rows[0].total, page: Number(page) };
  },

  async createUser({ name, email, password, role, phone, truck }) {
    return withTransaction(async (client) => {
      const passwordHash = await bcrypt.hash(password, 10);
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, email, passwordHash, role, phone || null]
      );
      let truckRow = null;
      if (role === "driver") {
        if (!truck?.truckNumber || !truck?.plateNumber || !truck?.capacity || !truck?.truckType) {
          const error = new Error("Driver registration requires truck details");
          error.status = 400;
          throw error;
        }
        const truckResult = await client.query(
          `INSERT INTO trucks (truck_number, plate_number, capacity, truck_type, driver_id, status)
           VALUES ($1, $2, $3, $4, $5, 'Available')
           RETURNING *`,
          [truck.truckNumber, truck.plateNumber, truck.capacity, truck.truckType, userResult.rows[0].id]
        );
        truckRow = truckResult.rows[0];
      }
      await writeAudit(client, {
        actorId: userResult.rows[0].id,
        action: "user.created",
        entity: "users",
        entityId: userResult.rows[0].id,
        meta: { role }
      });
      return {
        ...mapUser({
          ...userResult.rows[0],
          truck_id: truckRow?.id,
          truck_number: truckRow?.truck_number,
          plate_number: truckRow?.plate_number,
          truck_status: truckRow?.status
        })
      };
    });
  },

  async updateUser(id, payload) {
    const fields = [];
    const params = [];
    for (const [key, column] of [
      ["name", "name"],
      ["email", "email"],
      ["phone", "phone"],
      ["status", "status"],
      ["role", "role"]
    ]) {
      if (payload[key] !== undefined) {
        params.push(payload[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (payload.password) {
      params.push(await bcrypt.hash(payload.password, 10));
      fields.push(`password_hash = $${params.length}`);
    }
    if (!fields.length) return this.findUserById(id);
    params.push(id);
    await query(
      `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );
    return this.findUserById(id);
  },

  async deleteUser(id) {
    return withTransaction(async (client) => {
      await client.query(`UPDATE audit_logs SET actor_id = NULL WHERE actor_id = $1`, [id]);
      const result = await client.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
      return Boolean(result.rowCount);
    });
  },

  async listTrucks({ status, page = 1, limit = 50 } = {}) {
    const params = [];
    const clauses = [];
    if (status) {
      params.push(status);
      clauses.push(`t.status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);
    const result = await query(
      `SELECT t.*, u.name AS driver_name
       FROM trucks t
       JOIN users u ON u.id = t.driver_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM trucks t ${where}`,
      params.slice(0, params.length - 2)
    );
    return { data: result.rows.map(mapTruck), total: countResult.rows[0].total, page: Number(page) };
  },

  async createTruck(payload) {
    const result = await query(
      `INSERT INTO trucks (truck_number, plate_number, capacity, truck_type, driver_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        payload.truckNumber,
        payload.plateNumber,
        payload.capacity,
        payload.truckType || payload.type,
        payload.driverId,
        payload.status || "Available"
      ]
    );
    const joined = await query(
      `SELECT t.*, u.name AS driver_name FROM trucks t JOIN users u ON u.id = t.driver_id WHERE t.id = $1`,
      [result.rows[0].id]
    );
    return mapTruck(joined.rows[0]);
  },

  async deleteTruck(id) {
    return withTransaction(async (client) => {
      const truck = await client.query(`SELECT driver_id FROM trucks WHERE id = $1`, [id]);
      if (!truck.rowCount) return false;
      const activeTrip = await client.query(
        `SELECT id FROM trips
         WHERE truck_id = $1 AND status NOT IN ('Delivered', 'Cancelled')
         LIMIT 1`,
        [id]
      );
      if (activeTrip.rowCount) {
        const error = new Error("Cannot delete truck with active trips");
        error.status = 400;
        throw error;
      }
      await client.query(`DELETE FROM trucks WHERE id = $1`, [id]);
      return true;
    });
  },

  async updateTruck(id, payload) {
    const fields = [];
    const params = [];
    for (const [key, column] of [
      ["truckNumber", "truck_number"],
      ["plateNumber", "plate_number"],
      ["capacity", "capacity"],
      ["truckType", "truck_type"],
      ["type", "truck_type"],
      ["status", "status"],
      ["driverId", "driver_id"]
    ]) {
      if (payload[key] !== undefined) {
        params.push(payload[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (!fields.length) {
      const current = await query(
        `SELECT t.*, u.name AS driver_name FROM trucks t JOIN users u ON u.id = t.driver_id WHERE t.id = $1`,
        [id]
      );
      return mapTruck(current.rows[0]);
    }
    params.push(id);
    await query(
      `UPDATE trucks SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );
    const joined = await query(
      `SELECT t.*, u.name AS driver_name FROM trucks t JOIN users u ON u.id = t.driver_id WHERE t.id = $1`,
      [id]
    );
    return mapTruck(joined.rows[0]);
  },

  async listCargoRequests({ status, customerId, page = 1, limit = 20 } = {}) {
    const params = [];
    const clauses = [];
    if (status) {
      params.push(status);
      clauses.push(`c.status = $${params.length}`);
    }
    if (customerId) {
      params.push(customerId);
      clauses.push(`c.customer_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);
    const result = await query(
      `SELECT c.*,
              cu.name AS customer_name,
              dr.name AS driver_name,
              di.name AS dispatcher_name,
              tr.truck_number
       FROM cargo_requests c
       JOIN users cu ON cu.id = c.customer_id
       LEFT JOIN users dr ON dr.id = c.driver_id
       LEFT JOIN users di ON di.id = c.dispatcher_id
       LEFT JOIN trucks tr ON tr.id = c.truck_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM cargo_requests c ${where}`,
      params.slice(0, params.length - 2)
    );
    return {
      data: result.rows.map(mapCargoRequest),
      total: countResult.rows[0].total,
      page: Number(page)
    };
  },

  async createCargoRequest(payload) {
    const id = `REQ-${Math.floor(9000 + Math.random() * 1000)}`;
    return withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO cargo_requests
          (id, customer_id, pickup, destination, truck_type, weight, description, receiver, sender, special_instructions, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending')
         RETURNING *`,
        [
          id,
          payload.customerId,
          payload.pickup,
          payload.destination,
          payload.truckType,
          payload.weight,
          payload.description,
          payload.receiver || null,
          payload.sender || null,
          payload.specialInstructions || null
        ]
      );
      const notification = await createNotification(client, {
        type: "order.created",
        message: `${id} created by ${payload.customerName || "Customer"}`
      });
      await writeAudit(client, {
        actorId: payload.customerId,
        action: "cargo.created",
        entity: "cargo_requests",
        entityId: id
      });
      const joined = await client.query(
        `SELECT c.*, cu.name AS customer_name
         FROM cargo_requests c
         JOIN users cu ON cu.id = c.customer_id
         WHERE c.id = $1`,
        [id]
      );
      return { request: mapCargoRequest(joined.rows[0]), notification };
    });
  },

  async updateCargoRequest(id, payload, { customerId } = {}) {
    const existing = await query(`SELECT * FROM cargo_requests WHERE id = $1`, [id]);
    if (!existing.rowCount) return null;
    const row = existing.rows[0];
    if (customerId && row.customer_id !== customerId) {
      const error = new Error("Not allowed to update this request");
      error.status = 403;
      throw error;
    }
    if (row.status !== "Pending") {
      const error = new Error("Only pending requests can be edited");
      error.status = 400;
      throw error;
    }

    const fields = [];
    const params = [];
    for (const [key, column] of [
      ["pickup", "pickup"],
      ["destination", "destination"],
      ["truckType", "truck_type"],
      ["weight", "weight"],
      ["description", "description"],
      ["receiver", "receiver"],
      ["sender", "sender"],
      ["specialInstructions", "special_instructions"]
    ]) {
      if (payload[key] !== undefined) {
        params.push(payload[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (!fields.length) {
      const joined = await query(
        `SELECT c.*, cu.name AS customer_name
         FROM cargo_requests c
         JOIN users cu ON cu.id = c.customer_id
         WHERE c.id = $1`,
        [id]
      );
      return mapCargoRequest(joined.rows[0]);
    }
    params.push(id);
    await query(
      `UPDATE cargo_requests SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );
    const joined = await query(
      `SELECT c.*,
              cu.name AS customer_name,
              dr.name AS driver_name,
              di.name AS dispatcher_name,
              tr.truck_number
       FROM cargo_requests c
       JOIN users cu ON cu.id = c.customer_id
       LEFT JOIN users dr ON dr.id = c.driver_id
       LEFT JOIN users di ON di.id = c.dispatcher_id
       LEFT JOIN trucks tr ON tr.id = c.truck_id
       WHERE c.id = $1`,
      [id]
    );
    return mapCargoRequest(joined.rows[0]);
  },

  async assignCargoRequest(id, { driverId, truckId, dispatcherId }) {
    return withTransaction(async (client) => {
      const truckCheck = await client.query(`SELECT * FROM trucks WHERE id = $1 AND driver_id = $2`, [
        truckId,
        driverId
      ]);
      if (!truckCheck.rowCount) {
        const error = new Error("Truck must belong to the selected driver");
        error.status = 400;
        throw error;
      }

      const current = await client.query(`SELECT * FROM cargo_requests WHERE id = $1`, [id]);
      if (!current.rowCount) return null;
      const previous = current.rows[0];

      if (previous.truck_id && previous.truck_id !== truckId) {
        await client.query(`UPDATE trucks SET status = 'Available', updated_at = NOW() WHERE id = $1`, [
          previous.truck_id
        ]);
      }

      const updated = await client.query(
        `UPDATE cargo_requests
         SET status = 'Assigned',
             driver_id = $2,
             truck_id = $3,
             dispatcher_id = $4,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, driverId, truckId, dispatcherId]
      );
      if (!updated.rowCount) return null;

      const request = updated.rows[0];
      const existingTrip = await client.query(
        `SELECT id FROM trips
         WHERE cargo_request_id = $1 AND status NOT IN ('Delivered', 'Cancelled')
         ORDER BY created_at DESC
         LIMIT 1`,
        [id]
      );

      let tripId;
      if (existingTrip.rowCount) {
        tripId = existingTrip.rows[0].id;
        await client.query(
          `UPDATE trips
           SET driver_id = $2,
               truck_id = $3,
               dispatcher_id = $4,
               status = 'Assigned',
               updated_at = NOW()
           WHERE id = $1`,
          [tripId, driverId, truckId, dispatcherId]
        );
      } else {
        tripId = `SHP-${Math.floor(10000 + Math.random() * 9000)}`;
        await client.query(
          `INSERT INTO trips
            (id, cargo_request_id, customer_id, driver_id, dispatcher_id, truck_id, pickup, destination, distance, estimated_time, status, fare)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Assigned',$11)`,
          [
            tripId,
            request.id,
            request.customer_id,
            driverId,
            dispatcherId,
            truckId,
            request.pickup,
            request.destination,
            payloadDistance(request.pickup, request.destination),
            "8h 00m",
            estimateFare(request.weight)
          ]
        );
      }
      await client.query(`UPDATE trucks SET status = 'Busy', updated_at = NOW() WHERE id = $1`, [truckId]);

      const notification = await createNotification(client, {
        userId: driverId,
        type: "driver.assigned",
        message: `${id} assigned to driver`
      });
      await createNotification(client, {
        userId: request.customer_id,
        type: "driver.assigned",
        message: `${id} assigned. Trip ${tripId} created`
      });

      const joined = await client.query(
        `SELECT c.*,
                cu.name AS customer_name,
                dr.name AS driver_name,
                di.name AS dispatcher_name,
                tr.truck_number
         FROM cargo_requests c
         JOIN users cu ON cu.id = c.customer_id
         LEFT JOIN users dr ON dr.id = c.driver_id
         LEFT JOIN users di ON di.id = c.dispatcher_id
         LEFT JOIN trucks tr ON tr.id = c.truck_id
         WHERE c.id = $1`,
        [id]
      );
      return { request: mapCargoRequest(joined.rows[0]), tripId, notification };
    });
  },

  async cancelCargoRequest(id, actorId) {
    return withTransaction(async (client) => {
      const existing = await client.query(`SELECT * FROM cargo_requests WHERE id = $1`, [id]);
      if (!existing.rowCount) return null;
      const row = existing.rows[0];
      if (["Loaded", "In Transit", "Delivered"].includes(row.status)) {
        const error = new Error("Cannot cancel a request that is already in progress");
        error.status = 400;
        throw error;
      }

      if (row.truck_id) {
        await client.query(`UPDATE trucks SET status = 'Available', updated_at = NOW() WHERE id = $1`, [row.truck_id]);
      }

      await client.query(
        `UPDATE trips
         SET status = 'Cancelled', updated_at = NOW()
         WHERE cargo_request_id = $1 AND status NOT IN ('Delivered', 'Cancelled')`,
        [id]
      );

      const result = await client.query(
        `UPDATE cargo_requests
         SET status = 'Cancelled',
             driver_id = NULL,
             truck_id = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await createNotification(client, {
        userId: row.customer_id,
        type: "order.cancelled",
        message: `${id} cancelled`
      });
      if (actorId && actorId !== row.customer_id) {
        await createNotification(client, {
          userId: actorId,
          type: "order.cancelled",
          message: `${id} cancelled by dispatcher`
        });
      }

      const joined = await client.query(
        `SELECT c.*,
                cu.name AS customer_name,
                dr.name AS driver_name,
                di.name AS dispatcher_name,
                tr.truck_number
         FROM cargo_requests c
         JOIN users cu ON cu.id = c.customer_id
         LEFT JOIN users dr ON dr.id = c.driver_id
         LEFT JOIN users di ON di.id = c.dispatcher_id
         LEFT JOIN trucks tr ON tr.id = c.truck_id
         WHERE c.id = $1`,
        [id]
      );
      return mapCargoRequest(joined.rows[0]);
    });
  },

  async listTrips({ status, driverId, customerId, page = 1, limit = 50 } = {}) {
    const params = [];
    const clauses = [];
    if (status) {
      params.push(status);
      clauses.push(`t.status = $${params.length}`);
    }
    if (driverId) {
      params.push(driverId);
      clauses.push(`t.driver_id = $${params.length}`);
    }
    if (customerId) {
      params.push(customerId);
      clauses.push(`t.customer_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);
    const result = await query(
      `SELECT t.*,
              cu.name AS customer_name,
              dr.name AS driver_name,
              di.name AS dispatcher_name,
              tr.truck_number,
              cr.description AS cargo_description
       FROM trips t
       JOIN users cu ON cu.id = t.customer_id
       LEFT JOIN users dr ON dr.id = t.driver_id
       LEFT JOIN users di ON di.id = t.dispatcher_id
       LEFT JOIN trucks tr ON tr.id = t.truck_id
       LEFT JOIN cargo_requests cr ON cr.id = t.cargo_request_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM trips t ${where}`,
      params.slice(0, params.length - 2)
    );
    return { data: result.rows.map(mapTrip), total: countResult.rows[0].total, page: Number(page) };
  },

  async updateTripStatus(id, status, actorId) {
    return withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE trips SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, status]
      );
      if (!updated.rowCount) return null;
      const trip = updated.rows[0];

      if (trip.cargo_request_id) {
        const requestStatus =
          status === "Delayed" ? "In Transit" : status === "Cancelled" ? "Cancelled" : status;
        const allowed = [
          "Pending",
          "Assigned",
          "Accepted",
          "Arrived Pickup",
          "Loaded",
          "In Transit",
          "Delivered",
          "Cancelled"
        ];
        if (allowed.includes(requestStatus)) {
          await client.query(
            `UPDATE cargo_requests SET status = $2::request_status, updated_at = NOW() WHERE id = $1`,
            [trip.cargo_request_id, requestStatus]
          );
        }
      }

      if (status === "Delivered" || status === "Cancelled") {
        if (trip.truck_id) {
          await client.query(`UPDATE trucks SET status = 'Available', updated_at = NOW() WHERE id = $1`, [
            trip.truck_id
          ]);
        }
        if (status === "Delivered") {
          const existingPayment = await client.query(`SELECT id FROM payments WHERE trip_id = $1 LIMIT 1`, [
            trip.id
          ]);
          if (!existingPayment.rowCount) {
            await client.query(
              `INSERT INTO payments (trip_id, customer_id, amount, status, method)
               VALUES ($1, $2, $3, 'Paid', 'card')`,
              [trip.id, trip.customer_id, trip.fare]
            );
          }
        }
      }

      const typeMap = {
        Accepted: "driver.accepted",
        "Arrived Pickup": "driver.arrived",
        Delivered: "cargo.delivered"
      };
      const notification = await createNotification(client, {
        userId: trip.customer_id,
        type: typeMap[status] || "trip.status.updated",
        message: `${id} updated to ${status}`
      });
      await writeAudit(client, {
        actorId,
        action: "trip.status.updated",
        entity: "trips",
        entityId: id,
        meta: { status }
      });

      const joined = await client.query(
        `SELECT t.*,
                cu.name AS customer_name,
                dr.name AS driver_name,
                di.name AS dispatcher_name,
                tr.truck_number,
                cr.description AS cargo_description
         FROM trips t
         JOIN users cu ON cu.id = t.customer_id
         LEFT JOIN users dr ON dr.id = t.driver_id
         LEFT JOIN users di ON di.id = t.dispatcher_id
         LEFT JOIN trucks tr ON tr.id = t.truck_id
         LEFT JOIN cargo_requests cr ON cr.id = t.cargo_request_id
         WHERE t.id = $1`,
        [id]
      );
      return { trip: mapTrip(joined.rows[0]), notification };
    });
  },

  async updateTripLocation(id, { lat, lng }) {
    const result = await query(
      `UPDATE trips
       SET last_lat = $2, last_lng = $3, last_location_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, lat, lng]
    );
    if (!result.rowCount) return null;
    return {
      id,
      lastLocation: { lat, lng, updatedAt: new Date().toISOString() }
    };
  },

  async uploadTripProof(id, { deliveryProofUrl, signatureUrl }) {
    const result = await query(
      `UPDATE trips
       SET delivery_proof_url = COALESCE($2, delivery_proof_url),
           signature_url = COALESCE($3, signature_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, deliveryProofUrl || null, signatureUrl || null]
    );
    if (!result.rowCount) return null;
    return { id, deliveryProofUrl: result.rows[0].delivery_proof_url, signatureUrl: result.rows[0].signature_url };
  },

  async rejectTrip(id, driverId) {
    return withTransaction(async (client) => {
      const tripResult = await client.query(`SELECT * FROM trips WHERE id = $1 AND driver_id = $2`, [
        id,
        driverId
      ]);
      if (!tripResult.rowCount) return null;
      const trip = tripResult.rows[0];
      await client.query(
        `UPDATE trips SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      if (trip.cargo_request_id) {
        await client.query(
          `UPDATE cargo_requests
           SET status = 'Pending', driver_id = NULL, truck_id = NULL, updated_at = NOW()
           WHERE id = $1`,
          [trip.cargo_request_id]
        );
      }
      if (trip.truck_id) {
        await client.query(`UPDATE trucks SET status = 'Available', updated_at = NOW() WHERE id = $1`, [
          trip.truck_id
        ]);
      }
      const notification = await createNotification(client, {
        userId: trip.dispatcher_id,
        type: "trip.rejected",
        message: `${id} rejected by driver`
      });
      return { id, status: "Cancelled", notification };
    });
  },

  async listNotifications({ userId, page = 1, limit = 50 } = {}) {
    const params = [];
    const clauses = [];
    if (userId) {
      params.push(userId);
      clauses.push(`(user_id = $${params.length} OR user_id IS NULL)`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);
    const result = await query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { data: result.rows.map(mapNotification), total: result.rowCount };
  },

  async markNotificationRead(id) {
    const result = await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    return mapNotification(result.rows[0]);
  },

  async dashboardStats() {
    const result = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*)::int FROM users WHERE role = 'driver') AS total_drivers,
        (SELECT COUNT(*)::int FROM users WHERE role = 'dispatcher') AS total_dispatchers,
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM trucks) AS total_trucks,
        (SELECT COUNT(*)::int FROM cargo_requests WHERE status = 'Pending') AS pending_orders,
        (SELECT COUNT(*)::int FROM trips WHERE status = 'Delivered') AS completed_orders,
        (SELECT COUNT(*)::int FROM trips WHERE status IN ('In Transit', 'Loaded', 'Accepted', 'Arrived Pickup')) AS live_trips,
        (SELECT COUNT(*)::int FROM trips WHERE status = 'In Transit') AS in_transit,
        (SELECT COALESCE(SUM(amount), 0)::float FROM payments WHERE status = 'Paid') AS revenue,
        (SELECT COUNT(*)::int FROM cargo_requests WHERE created_at::date = CURRENT_DATE) AS todays_orders,
        (SELECT COUNT(*)::int FROM trucks WHERE status = 'Available') AS available_trucks
    `);
    const row = result.rows[0];
    return {
      totalCustomers: row.total_customers,
      totalDrivers: row.total_drivers,
      totalDispatchers: row.total_dispatchers,
      totalUsers: row.total_users,
      totalTrucks: row.total_trucks,
      pendingOrders: row.pending_orders,
      completedOrders: row.completed_orders,
      liveTrips: row.live_trips,
      inTransit: row.in_transit,
      revenue: row.revenue,
      todaysOrders: row.todays_orders,
      availableTrucks: row.available_trucks
    };
  },

  async revenueReport({ period = "monthly" } = {}) {
    const buckets =
      period === "weekly"
        ? `TO_CHAR(created_at, 'Dy')`
        : period === "yearly"
          ? `TO_CHAR(created_at, 'YYYY')`
          : period === "daily"
            ? `TO_CHAR(created_at, 'HH24:00')`
            : `TO_CHAR(created_at, '"Week" WW')`;

    const result = await query(
      `SELECT ${buckets} AS label, COALESCE(SUM(amount), 0)::float AS revenue
       FROM payments
       WHERE status = 'Paid'
       GROUP BY 1
       ORDER BY 1`
    );
    if (!result.rowCount) {
      return {
        period,
        data: [
          { label: "Week 1", revenue: 0 },
          { label: "Week 2", revenue: 0 },
          { label: "Week 3", revenue: 0 },
          { label: "Week 4", revenue: 0 }
        ]
      };
    }
    return { period, data: result.rows.map((row) => ({ label: row.label, revenue: row.revenue })) };
  },

  async performanceReport() {
    const drivers = await query(`
      SELECT u.name,
             COUNT(t.id)::int AS completed_trips,
             COALESCE(SUM(t.fare), 0)::float AS earnings,
             4.8 AS rating
      FROM users u
      LEFT JOIN trips t ON t.driver_id = u.id AND t.status = 'Delivered'
      WHERE u.role = 'driver'
      GROUP BY u.id
      ORDER BY completed_trips DESC
    `);
    const dispatchers = await query(`
      SELECT u.name,
             COUNT(t.id)::int AS assigned_trips,
             CASE WHEN COUNT(t.id) = 0 THEN 0
                  ELSE ROUND(COUNT(*) FILTER (WHERE t.status = 'Delivered')::numeric / COUNT(*)::numeric, 2)
             END AS close_rate
      FROM users u
      LEFT JOIN trips t ON t.dispatcher_id = u.id
      WHERE u.role = 'dispatcher'
      GROUP BY u.id
      ORDER BY assigned_trips DESC
    `);
    return {
      drivers: drivers.rows.map((row) => ({
        name: row.name,
        completedTrips: row.completed_trips,
        earnings: row.earnings,
        rating: Number(row.rating)
      })),
      dispatchers: dispatchers.rows.map((row) => ({
        name: row.name,
        assignedTrips: row.assigned_trips,
        closeRate: Number(row.close_rate)
      }))
    };
  },

  async shipmentDistribution() {
    const result = await query(`
      SELECT status, COUNT(*)::int AS value
      FROM trips
      GROUP BY status
    `);
    return result.rows.map((row) => ({ name: row.status, value: row.value }));
  },

  async listTruckTypes() {
    const result = await query(`SELECT * FROM truck_types ORDER BY name`);
    return result.rows;
  },

  async getSettings() {
    const result = await query(`SELECT key, value FROM settings`);
    return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
  },

  async updateSettings(key, value) {
    const result = await query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING key, value`,
      [key, JSON.stringify(value)]
    );
    return result.rows[0];
  },

  async createPayment({ tripId, customerId, amount, status = "Pending", method = "card" }) {
    const result = await query(
      `INSERT INTO payments (trip_id, customer_id, amount, status, method)
       VALUES ($1, $2, $3, $4::payment_status, $5)
       RETURNING *`,
      [tripId || null, customerId, amount, status, method]
    );
    const row = result.rows[0];
    const customer = await query(`SELECT name FROM users WHERE id = $1`, [row.customer_id]);
    return {
      id: row.id,
      tripId: row.trip_id,
      customerId: row.customer_id,
      customer: customer.rows[0]?.name,
      amount: Number(row.amount),
      status: row.status,
      method: row.method,
      createdAt: row.created_at
    };
  },

  async deletePayment(id) {
    const result = await query(`DELETE FROM payments WHERE id = $1 RETURNING id`, [id]);
    return Boolean(result.rowCount);
  },

  async updatePayment(id, { status }) {
    const result = await query(
      `UPDATE payments SET status = $2::payment_status WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (!result.rowCount) return null;
    const row = result.rows[0];
    const customer = await query(`SELECT name FROM users WHERE id = $1`, [row.customer_id]);
    return {
      id: row.id,
      tripId: row.trip_id,
      customerId: row.customer_id,
      customer: customer.rows[0]?.name,
      amount: Number(row.amount),
      status: row.status,
      method: row.method,
      createdAt: row.created_at
    };
  },

  async listPayments({ page = 1, limit = 50 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const result = await query(
      `SELECT p.*, u.name AS customer_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.customer_id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [Number(limit), offset]
    );
    return {
      data: result.rows.map((row) => ({
        id: row.id,
        tripId: row.trip_id,
        customerId: row.customer_id,
        customer: row.customer_name,
        amount: Number(row.amount),
        status: row.status,
        method: row.method,
        createdAt: row.created_at
      })),
      total: result.rowCount
    };
  },

  async listAuditLogs({ page = 1, limit = 50 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const result = await query(
      `SELECT a.*, u.name AS actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [Number(limit), offset]
    );
    return {
      data: result.rows.map((row) => ({
        id: row.id,
        actorId: row.actor_id,
        actor: row.actor_name,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        meta: row.meta,
        createdAt: row.created_at
      }))
    };
  }
};

function payloadDistance(from, to) {
  return `${Math.max(80, Math.abs(String(from).length * 37 + String(to).length * 29))} mi`;
}

function estimateFare(weight) {
  const numeric = Number(String(weight).replace(/[^\d.]/g, "")) || 1;
  return Math.round(numeric * 650 * 100) / 100;
}
