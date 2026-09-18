import { Link } from "react-router";
import { PlusIcon } from "@/components/icons";
import { focusRing, textLinkClass } from "@/components/ui/styles";

const QUESTIONS = [
  {
    question: "ยกเลิกออเดอร์ได้ไหม?",
    answer: "ยกเลิกได้ระหว่างที่ออเดอร์ยังรอคิวอยู่ เมื่อร้านเริ่มทำอาหารแล้วจะยกเลิกผ่านแอปไม่ได้",
  },
  {
    question: "เวลารอแม่นแค่ไหน?",
    answer:
      "MealQ ประเมินเวลาจากจำนวนคิวก่อนหน้าและเวลาเตรียมของแต่ละเมนู แล้วอัปเดตทันทีทุกครั้งที่ร้านเปลี่ยนสถานะออเดอร์",
  },
  {
    question: "ร้านค้าสมัครอย่างไร?",
    answer:
      "กด “ฉันเป็นร้านค้า” แล้วเลือกบัญชีแบบร้านค้าตอนสมัคร จากนั้นเพิ่มข้อมูลร้านและเมนูเพื่อเริ่มรับออเดอร์",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-5 py-10 sm:px-8 lg:grid lg:grid-cols-[1fr_1.6fr] lg:gap-16 lg:py-20"
    >
      <div>
        <h2 id="faq-title" className="text-3xl font-bold text-ink lg:text-5xl">
          คำถามที่พบบ่อย
        </h2>
        <p className="mt-4 hidden text-lg text-ink-soft lg:block">
          ไม่เจอคำตอบที่ต้องการ?{" "}
          <Link to="/help" className={textLinkClass}>
            ติดต่อทีมช่วยเหลือ
          </Link>
        </p>
      </div>

      <div className="mt-6 space-y-3 lg:mt-0">
        {QUESTIONS.map((item) => (
          <details
            key={item.question}
            className="group rounded-4xl bg-white ring-1 ring-line transition-colors open:bg-mint/60 open:ring-leaf"
          >
            <summary
              className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-4xl px-6 py-5 font-semibold text-ink lg:px-8 lg:py-6 lg:text-lg [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              {item.question}
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mint transition-colors group-open:bg-brand">
                <PlusIcon className="size-4 text-ink transition-transform group-open:rotate-45" />
              </span>
            </summary>
            <p className="px-6 pb-5 leading-relaxed text-ink-soft lg:px-8 lg:pb-6 lg:text-lg">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
