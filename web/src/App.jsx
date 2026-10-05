import { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://app-clinicapp-api-66025234-ctfhhgedezh9g0as.japaneast-01.azurewebsites.net';

export default function App() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    room_id: '',
    customer_name: '',
    customer_phone: '',
    check_in: '',
    check_out: ''
  });

  // โหลดข้อมูลห้องพักและรายการจอง
  const fetchData = async () => {
    try {
      const [resRooms, resBookings] = await Promise.all([
        fetch(`${API_BASE}/rooms`),
        fetch(`${API_BASE}/bookings`)
      ]);

      if (resRooms.ok) setRooms(await resRooms.json());
      if (resBookings.ok) setBookings(await resBookings.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ส่งข้อมูล (สร้างใหม่ หรือ แก้ไขวันจอง)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const isEdit = Boolean(editingBookingId);
    const url = isEdit ? `${API_BASE}/bookings/${editingBookingId}` : `${API_BASE}/bookings`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ เกิดข้อผิดพลาด: ${data.message || data.error}`);
      } else {
        alert(isEdit ? '✅ แก้ไขวันจองสำเร็จ!' : '✅ จองห้องพักเรียบร้อย!');
        resetForm();
        fetchData();
      }
    } catch (err) {
      alert('❌ ไม่สามารถเชื่อมต่อกับ Server ได้');
    } finally {
      setLoading(false);
    }
  };

  // เตรียมข้อมูลสำหรับแก้ไขการจอง
  const handleEditClick = (booking) => {
    setEditingBookingId(booking.booking_id);
    setFormData({
      room_id: booking.room_id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      check_in: booking.check_in.split('T')[0],
      check_out: booking.check_out.split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ยกเลิกการจอง (DELETE)
  const handleCancelClick = async (bookingId) => {
    if (!confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('✅ ยกเลิกการจองเรียบร้อย!');
        fetchData();
      } else {
        const data = await res.json();
        alert(`❌ ไม่สามารถยกเลิกได้: ${data.error}`);
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการยกเลิก');
    }
  };

  // ล้างฟอร์ม
  const resetForm = () => {
    setEditingBookingId(null);
    setFormData({
      room_id: '',
      customer_name: '',
      customer_phone: '',
      check_in: '',
      check_out: ''
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#1a365d' }}>🏨 ระบบจองห้องพักโรงแรมออนไลน์</h1>

      {/* ฟอร์มการจอง / แก้ไข */}
      <section style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h2 style={{ marginTop: 0, color: '#2563eb' }}>
          {editingBookingId ? '✏️ แก้ไขข้อมูลการจอง' : '➕ จองห้องพักใหม่'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>เลือกห้องพัก:</label>
            <select
              required
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: Number(e.target.value) })}
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            >
              <option value="">-- กรุณาเลือกห้องพัก --</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  ห้อง {r.room_number} ({r.room_type}) - ฿{r.price_per_night.toLocaleString()} / คืน [{r.status}]
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ชื่อผู้จอง:</label>
              <input
                type="text"
                required
                placeholder="เช่น สมชาย ใจดี"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>เบอร์โทรศัพท์:</label>
              <input
                type="tel"
                required
                placeholder="0812345678"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>วันเช็คอิน (Check-in):</label>
              <input
                type="date"
                required
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>วันเช็คเอาต์ (Check-out):</label>
              <input
                type="date"
                required
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: '12px', background: editingBookingId ? '#eab308' : '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? 'กำลังบันทึก...' : editingBookingId ? 'อัปเดตการจอง' : 'ยืนยันการจอง'}
            </button>

            {editingBookingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: '12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                ยกเลิกแก้ไข
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ตารางแสดงรายการการจอง */}
      <section>
        <h2>📋 ตารางรายการการจองทั้งหมด</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>ห้อง</th>
                <th style={{ padding: '12px' }}>ชื่อผู้จอง</th>
                <th style={{ padding: '12px' }}>เบอร์โทร</th>
                <th style={{ padding: '12px' }}>เช็คอิน</th>
                <th style={{ padding: '12px' }}>เช็คเอาต์</th>
                <th style={{ padding: '12px' }}>สถานะ</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    ยังไม่มีรายการจองในระบบ
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.booking_id} style={{ borderBottom: '1px solid #e2e8f0', opacity: b.status === 'cancelled' ? 0.5 : 1 }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                      {b.room_number} ({b.room_type})
                    </td>
                    <td style={{ padding: '12px' }}>{b.customer_name}</td>
                    <td style={{ padding: '12px' }}>{b.customer_phone}</td>
                    <td style={{ padding: '12px' }}>{new Date(b.check_in).toLocaleDateString('th-TH')}</td>
                    <td style={{ padding: '12px' }}>{new Date(b.check_out).toLocaleDateString('th-TH')}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: b.status === 'booked' ? '#dcfce7' : '#fee2e2',
                        color: b.status === 'booked' ? '#166534' : '#991b1b'
                      }}>
                        {b.status === 'booked' ? 'จองแล้ว' : 'ยกเลิกแล้ว'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {b.status === 'booked' && (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditClick(b)}
                            style={{ padding: '6px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            แก้วัน
                          </button>
                          <button
                            onClick={() => handleCancelClick(b.booking_id)}
                            style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}