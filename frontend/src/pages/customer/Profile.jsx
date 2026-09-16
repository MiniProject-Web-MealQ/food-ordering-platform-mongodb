/*
  Profile.jsx
  --------------------------------------------------
  หน้า Profile ของลูกค้า

  ภายหลังจะใช้แสดงข้อมูลจาก User
  ที่ Login อยู่จริง
*/

function Profile() {
  return (
    <div>
      <h2>Profile</h2>

      {/* ข้อมูลจำลอง */}
      <section>
        <h3>Personal Information</h3>

        <p>
          Name: Demo Customer
        </p>

        <p>
          Email: customer@mealq.local
        </p>
      </section>

      <hr />

      {/* ที่อยู่จัดส่ง */}
      <section>
        <h3>Delivery Address</h3>

        <p>
          123 MealQ Street, Bangkok
        </p>

        <button type="button">
          Edit Profile
        </button>
      </section>
    </div>
  );
}

export default Profile;