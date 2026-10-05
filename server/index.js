import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSqlPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Serve Static Files จากโฟลเดอร์ web/dist (ถ้ามี)
const clientBuildPath = path.join(__dirname, '../web/dist');
app.use(express.static(clientBuildPath));

// ==========================================
// API ROUTES
// ==========================================

// GET /api/rooms หรือ /rooms
app.get(['/api/rooms', '/rooms'], async (req, res) => {
  try {
    const pool = await getSqlPool();
    const result = await pool.request().query(`
      SELECT room_id, room_number, room_type, price_per_night, status, created_at
      FROM rooms
      ORDER BY room_number
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('GET /rooms error:', error);
    res.status(500).json({ error: 'failed_to_load_rooms' });
  }
});

// GET /api/bookings หรือ /bookings
app.get(['/api/bookings', '/bookings'], async (req, res) => {
  try {
    const pool = await getSqlPool();
    const result = await pool.request().query(`
      SELECT
        b.booking_id, b.room_id, r.room_number, r.room_type, r.price_per_night,
        b.customer_name, b.customer_phone, b.check_in, b.check_out, b.status, b.created_at
      FROM bookings b
      INNER JOIN rooms r ON b.room_id = r.room_id
      ORDER BY b.check_in, r.room_number
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('GET /bookings error:', error);
    res.status(500).json({ error: 'failed_to_load_bookings' });
  }
});

// POST /api/bookings หรือ /bookings
app.post(['/api/bookings', '/bookings'], async (req, res) => {
  try {
    const { room_id, customer_name, customer_phone, check_in, check_out } = req.body;

    if (!room_id || !customer_name || !customer_phone || !check_in || !check_out) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    if (check_out <= check_in) {
      return res.status(400).json({ error: 'invalid_dates', message: 'Check-out must be after check-in' });
    }

    const pool = await getSqlPool();

    // Check room availability
    const roomResult = await pool.request()
      .input('room_id', sql.Int, room_id)
      .query('SELECT room_id, status FROM rooms WHERE room_id = @room_id');

    if (roomResult.recordset.length === 0) {
      return res.status(404).json({ error: 'room_not_found' });
    }

    // Check booking overlap
    const conflictResult = await pool.request()
      .input('room_id', sql.Int, room_id)
      .input('check_in', sql.Date, check_in)
      .input('check_out', sql.Date, check_out)
      .query(`
        SELECT booking_id FROM bookings
        WHERE room_id = @room_id AND status = 'booked'
          AND @check_in < check_out AND @check_out > check_in
      `);

    if (conflictResult.recordset.length > 0) {
      return res.status(409).json({ error: 'room_already_booked', message: 'This room is already booked for these dates' });
    }

    // Create booking
    const result = await pool.request()
      .input('room_id', sql.Int, room_id)
      .input('customer_name', sql.NVarChar(100), customer_name)
      .input('customer_phone', sql.NVarChar(30), customer_phone)
      .input('check_in', sql.Date, check_in)
      .input('check_out', sql.Date, check_out)
      .query(`
        INSERT INTO bookings (room_id, customer_name, customer_phone, check_in, check_out, status)
        OUTPUT INSERTED.booking_id
        VALUES (@room_id, @customer_name, @customer_phone, @check_in, @check_out, 'booked')
      `);

    res.status(201).json({ message: 'Booking created successfully', booking_id: result.recordset[0].booking_id });
  } catch (error) {
    console.error('POST /bookings error:', error);
    res.status(500).json({ error: 'failed_to_create_booking' });
  }
});

// PUT /api/bookings/:id หรือ /bookings/:id
app.put(['/api/bookings/:id', '/bookings/:id'], async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { room_id, customer_name, customer_phone, check_in, check_out } = req.body;

    if (!bookingId || !room_id || !customer_name || !customer_phone || !check_in || !check_out) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const pool = await getSqlPool();

    const conflictResult = await pool.request()
      .input('room_id', sql.Int, room_id)
      .input('booking_id', sql.Int, bookingId)
      .input('check_in', sql.Date, check_in)
      .input('check_out', sql.Date, check_out)
      .query(`
        SELECT booking_id FROM bookings
        WHERE room_id = @room_id AND booking_id <> @booking_id AND status = 'booked'
          AND @check_in < check_out AND @check_out > check_in
      `);

    if (conflictResult.recordset.length > 0) {
      return res.status(409).json({ error: 'room_already_booked', message: 'This room is already booked for these dates' });
    }

    await pool.request()
      .input('booking_id', sql.Int, bookingId)
      .input('room_id', sql.Int, room_id)
      .input('customer_name', sql.NVarChar(100), customer_name)
      .input('customer_phone', sql.NVarChar(30), customer_phone)
      .input('check_in', sql.Date, check_in)
      .input('check_out', sql.Date, check_out)
      .query(`
        UPDATE bookings
        SET room_id = @room_id, customer_name = @customer_name, customer_phone = @customer_phone, check_in = @check_in, check_out = @check_out
        WHERE booking_id = @booking_id
      `);

    res.json({ message: 'Booking updated successfully' });
  } catch (error) {
    console.error('PUT /bookings/:id error:', error);
    res.status(500).json({ error: 'failed_to_update_booking' });
  }
});

// DELETE /api/bookings/:id หรือ /bookings/:id
app.delete(['/api/bookings/:id', '/bookings/:id'], async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const pool = await getSqlPool();

    const result = await pool.request()
      .input('booking_id', sql.Int, bookingId)
      .query("UPDATE bookings SET status = 'cancelled' WHERE booking_id = @booking_id AND status = 'booked'");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'booking_not_found' });
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('DELETE /bookings/:id error:', error);
    res.status(500).json({ error: 'failed_to_cancel_booking' });
  }
});

// Fallback: ถ้าไม่ใช่ API ให้ส่งหน้า Frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.json({ message: 'Hotel Booking API', status: 'running' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Hotel API listening on :${PORT}`);
});