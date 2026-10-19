function IOSSteps() {
  return <>
      <h3 className="font-semibold text-ink">ติดตั้งบน iPhone/iPad เพื่อรับแจ้งเตือน</h3>
      <ol className="list-decimal space-y-1 pl-5">
        <li>เปิด <strong>mealq.site</strong> ใน Safari</li>
        <li>กดแชร์ → เพิ่มไปยังหน้าจอโฮม (Add to Home Screen) และเปิด “Open as Web App” หากมีตัวเลือก</li>
        <li>เปิดไอคอน MealQ จากหน้าจอโฮม แล้วเข้าสู่ระบบลูกค้าหรือร้านค้า</li>
        <li>สำหรับลูกค้า ไปที่ บัญชีของฉัน → การแจ้งเตือน → แจ้งเตือนบนอุปกรณ์นี้ ส่วนร้านค้าไปที่ แจ้งเตือนร้าน → อุปกรณ์นี้ แล้วกดเปิดแจ้งเตือนและเลือกอนุญาต</li>
      </ol>
      <p>ต้องใช้ iOS/iPadOS 16.4 ขึ้นไป การเปิดในแท็บ Safari อย่างเดียวยังรับ Web Push ไม่ได้</p>
  </>;
}
function AndroidSteps() {
  return <><h3 className="font-semibold text-ink">Android Chrome</h3><p>เมนู ⋮ → ติดตั้งแอปหรือเพิ่มไปยังหน้าจอหลัก แล้วเปิดไอคอน MealQ เข้าสู่ระบบ และกดเปิดแจ้งเตือนอุปกรณ์นี้ บางเบราว์เซอร์อาจไม่รองรับ</p><p>ตรวจสิทธิ์แจ้งเตือน โหมดห้ามรบกวน และข้อจำกัดแบตเตอรี่ของเครื่องด้วย</p></>;
}
export function MobilePushGuide({ platform }) {
  return <div className="space-y-2 rounded-2xl border border-haze bg-white/60 p-3 text-sm text-ink-soft">
    {platform.ios ? platform.oldIOS ? <p>iPhone/iPad ต้องใช้ iOS/iPadOS 16.4 ขึ้นไปจึงรับ Web Push ได้ คุณเลือกการแจ้งเตือนทางอีเมลแทนได้</p> : platform.standalone ? <p>เปิดจากไอคอนบนหน้าจอโฮมแล้ว กดเปิดแจ้งเตือนอุปกรณ์นี้และเลือกอนุญาต หากเคยปฏิเสธ ให้ตรวจการแจ้งเตือนของ MealQ ในการตั้งค่า iPhone/iPad</p> : <IOSSteps /> : platform.android ? <AndroidSteps /> : <>
      <p>คอมพิวเตอร์: กดเปิดแจ้งเตือนและอนุญาตในเบราว์เซอร์ หากเคยปฏิเสธ ให้เปลี่ยนสิทธิ์การแจ้งเตือนของ mealq.site ในการตั้งค่าเว็บไซต์</p>
      <details><summary className="cursor-pointer font-semibold text-ink">วิธีตั้งค่าบน iPhone/iPad และ Android</summary><div className="mt-2 space-y-3"><IOSSteps /><AndroidSteps /></div></details>
    </>}
    <p>รับแจ้งเตือนได้เมื่อปิดหน้าเว็บ หากระบบและเบราว์เซอร์อนุญาตการทำงานเบื้องหลัง การปิดเครื่องหรือปิดสิทธิ์อาจทำให้ไม่ได้รับ</p>
  </div>;
}
