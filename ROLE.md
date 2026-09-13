# ทีมพัฒนา (Multi-agent Roles)

Claude ตัวหลัก (Opus) = **Project Owner (PO)** รับโจทย์จากผู้ใช้ แตกงาน แจกให้ subagent ตามบทบาท และรวมผล/ตรวจรับ
นิยาม subagent อยู่ที่ `.claude/agents/*.md`

| บทบาท | โมเดล | หน้าที่ | Skill หลัก |
|--------|-------|---------|-----------|
| **PO** (ตัวหลัก) | opus | แจกงาน / ตัดสินใจ / ตรวจรับ / รวมผล | — |
| **developer** | sonnet | เขียนโค้ด frontend + backend | run, simplify, init |
| **qa** | haiku | เขียน/รันเทสต์, verify, review | verify, code-review, security-review |
| **devops** | haiku | build, CI/CD, container, deploy | run |
| **designer** | sonnet | UI/UX, layout, design system, mockup | web-design-guidelines |

> **นโยบายโมเดล:** ประหยัดเป็นหลัก — sonnet สำหรับงานเขียนโค้ด + งานออกแบบ (UI/UX ต้องใช้โมเดลเก่ง), qa/devops = haiku, opus เฉพาะ PO

## Workflow มาตรฐาน (ต่อ 1 feature)
```
designer (ออกแบบ UX/layout)
   → developer (implement)
      → qa (verify + test)
         → devops (build/deploy)
```
- งานที่ไม่มี UI ใหม่ → ข้าม designer ได้
- PO เป็นผู้ตัดสินว่างานไหนแจกใคร ทำขนานหรือเรียงลำดับ
- ทุก subagent รายงานผลกลับ PO → PO ตรวจรับก่อนไปขั้นถัดไป

## หลักการแต่ละบทบาท
- **developer** — ใช้ pattern/utility ซ้ำ, เขียนกลมกลืน, ทำทีละ feature ให้รันได้จริง, spec กำกวมให้ถาม
- **qa** — รายงานผลตามจริง (fail ต้องบอก), reproduce บั๊กชัด, ระบุ severity
- **devops** — ไม่ใส่ secret จริงในไฟล์, แยก config ตาม env, ยืนยัน build/start ได้ก่อนส่ง
- **designer** — ใช้งานง่ายก่อนสวย, consistency ทั้งระบบ, ส่ง output ที่ dev implement ต่อได้ทันที
