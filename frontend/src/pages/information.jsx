import { Link } from "react-router";
import { Logo } from "@/components/brand/logo";
import { usePageTitle } from "@/lib/use-page-title";

const CONTENT = {
  help: { title: "ช่วยเหลือ", paragraphs: ["ลูกค้า: เลือกร้านและเมนู เพิ่มลงตะกร้า แล้วชำระเงิน ติดตามสถานะได้ที่หน้าออเดอร์ เมื่ออาหารพร้อม ให้แสดง QR หรือรหัสรับอาหาร 4 หลักแก่ร้านค้า", "ร้านค้า: เข้าสู่ระบบโดยเลือก ‘ร้านค้า’ เพื่อจัดการเมนู เปิดหรือปิดร้าน รับออเดอร์ และยืนยันรับอาหารด้วยรหัสของลูกค้า", "หากเข้าสู่ระบบไม่ได้ ให้ตรวจว่า Backend และ MongoDB เปิดอยู่ และใช้อีเมลตรงกับประเภทบัญชี หากลืมรหัสผ่าน ให้ใช้หน้าลืมรหัสผ่าน"] },
  terms: { title: "เงื่อนไขการใช้งาน", paragraphs: ["ใช้บัญชีของคุณในการสั่งอาหารหรือจัดการร้าน ตรวจสอบร้าน เมนู จำนวน และจุดรับอาหารก่อนยืนยันออเดอร์", "รักษารหัสผ่านและรหัสรับอาหารของคุณ คำขอยกเลิกทำได้ก่อนร้านเริ่มเตรียมอาหารตามสถานะที่ระบบอนุญาต", "การชำระเงินในโหมดทดสอบเป็นการจำลองและไม่มีการตัดเงินจริง ผู้ดูแลต้องตั้งค่าบริการชำระเงินจริงก่อนเปิดรับชำระเงินภายนอก"] },
  privacy: { title: "ความเป็นส่วนตัว", paragraphs: ["ระบบบันทึกชื่อ อีเมล เบอร์โทร รายการสั่งอาหาร และร้านที่คุณบันทึก เพื่อให้ใช้งานบัญชี ติดตามออเดอร์ และติดต่อเกี่ยวกับอาหารที่สั่ง", "รหัสผ่านเก็บในรูปแบบแฮช การเข้าสู่ระบบใช้คุกกี้สำหรับยืนยันบัญชี เบราว์เซอร์เก็บตะกร้าและการตั้งค่าหน้าจอของคุณ", "ร้านค้าเห็นข้อมูลที่จำเป็นสำหรับเตรียมและส่งมอบออเดอร์ ผู้ดูแลระบบมีสิทธิ์จัดการบัญชี ร้าน และรายการสั่งอาหาร ติดต่อผู้ดูแลระบบที่คุณใช้งานเพื่อขอแก้ไขข้อมูลบัญชี"] },
};

export default function InformationPage({ kind }) {
  const content = CONTENT[kind];
  usePageTitle(content.title);
  return <main className="min-h-dvh bg-page px-5 py-10"><div className="mx-auto max-w-3xl space-y-8 rounded-4xl bg-white p-6 shadow-card sm:p-10"><Link to="/"><Logo /></Link><h1 className="text-3xl font-bold text-ink">{content.title}</h1>{content.paragraphs.map((text) => <p className="leading-relaxed text-ink-soft" key={text}>{text}</p>)}<div className="flex gap-6"><Link className="font-semibold text-brand-ink underline" to="/login">เข้าสู่ระบบ</Link><Link className="font-semibold text-brand-ink underline" to="/customer">เลือกร้านอาหาร</Link></div></div></main>;
}
