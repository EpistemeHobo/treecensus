import type { UiTopicKey } from './ui-dictionary'

/**
 * User-guide narrative content, one entry per UI_DICTIONARY topic.
 *
 * Typed as Record<UiTopicKey, GuideTopicContent>, so adding or removing a
 * category in ui-dictionary.ts forces a matching change here at compile time.
 * The related-labels table on the guide page comes from UI_DICTIONARY itself;
 * this file only holds the prose.
 */

export interface GuideTopicContent {
  intro_en: string
  intro_th: string
  steps_en: string[]
  steps_th: string[]
  tips_en?: string[]
  tips_th?: string[]
}

export const GUIDE_CONTENT: Record<UiTopicKey, GuideTopicContent> = {
  'getting-started': {
    intro_en:
      'The Tree Census Field Portal is restricted to authorised users. You sign in with the email address and password issued by your administrator; what you can see and do afterwards depends on the role attached to your account.',
    intro_th:
      'พอร์ทัลภาคสนามสำมะโนป่าชายเลนจำกัดการเข้าถึงเฉพาะผู้ใช้ที่ได้รับอนุญาตเท่านั้น ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่านที่ผู้ดูแลระบบออกให้ สิ่งที่คุณเห็นและทำได้หลังเข้าสู่ระบบขึ้นอยู่กับบทบาทของบัญชีคุณ',
    steps_en: [
      'Open the portal in your browser — you will land on the login page.',
      'Enter your Email and Password, then press "Sign in".',
      'If you see "Login failed", check for typos and try again; after repeated failures contact your administrator.',
      'Once signed in you are taken to the Dashboard. Your name, role, and the menus you are allowed to use appear in the left sidebar.',
      'To leave the portal, click "Sign out" at the bottom of the sidebar.',
    ],
    steps_th: [
      'เปิดพอร์ทัลในเบราว์เซอร์ — ระบบจะแสดงหน้าลงชื่อเข้าใช้',
      'กรอกอีเมลและรหัสผ่าน แล้วกด "เข้าสู่ระบบ"',
      'หากขึ้นข้อความ "เข้าสู่ระบบไม่สำเร็จ" ให้ตรวจสอบการพิมพ์แล้วลองใหม่ หากยังไม่ได้หลายครั้งให้ติดต่อผู้ดูแลระบบ',
      'เมื่อเข้าสู่ระบบแล้ว ระบบจะพาไปยังหน้าแดชบอร์ด ชื่อ บทบาท และเมนูที่คุณมีสิทธิ์ใช้จะแสดงในแถบด้านซ้าย',
      'หากต้องการออกจากพอร์ทัล คลิก "ออกจากระบบ" ที่ด้านล่างของแถบเมนู',
    ],
    tips_en: [
      'There is no self-registration — accounts are created by an administrator (see the User Management topic).',
      'If you forget your password, an administrator can reset it for you.',
    ],
    tips_th: [
      'ระบบไม่เปิดให้สมัครสมาชิกเอง — บัญชีจะถูกสร้างโดยผู้ดูแลระบบ (ดูหัวข้อการจัดการผู้ใช้)',
      'หากลืมรหัสผ่าน ผู้ดูแลระบบสามารถรีเซ็ตรหัสผ่านให้คุณได้',
    ],
  },
  'navigation': {
    intro_en:
      'The portal is laid out as a fixed left sidebar plus a main content area. The sidebar lists every page your role can access; the top bar of each page shows its title, the language toggle, and the app version.',
    intro_th:
      'พอร์ทัลประกอบด้วยแถบเมนูด้านซ้ายและพื้นที่เนื้อหาหลัก แถบเมนูแสดงทุกหน้าที่บทบาทของคุณเข้าถึงได้ ส่วนแถบด้านบนของแต่ละหน้าแสดงชื่อหน้า ปุ่มสลับภาษา และเวอร์ชันของระบบ',
    steps_en: [
      'Use the sidebar to move between Dashboard, Data, Maps & Statistics, Reports, User Guide, Admin, and Settings.',
      'Menus you do not have permission for are hidden — e.g. Admin appears only for administrators.',
      'The highlighted (coral) item shows which page you are on.',
      'Switch the interface language at any time with the TH / ENG toggle in the top bar; the choice is remembered on this device.',
      'Your profile chip at the bottom of the sidebar shows who is signed in and their role.',
    ],
    steps_th: [
      'ใช้แถบเมนูด้านซ้ายเพื่อสลับระหว่างหน้าแดชบอร์ด ข้อมูล แผนที่และสถิติ รายงาน คู่มือการใช้งาน ผู้ดูแลระบบ และตั้งค่า',
      'เมนูที่คุณไม่มีสิทธิ์ใช้จะถูกซ่อน — เช่น เมนูผู้ดูแลระบบจะแสดงเฉพาะผู้ดูแลระบบเท่านั้น',
      'เมนูที่ไฮไลต์ (สีส้มอมชมพู) คือหน้าที่คุณกำลังเปิดอยู่',
      'สลับภาษาได้ตลอดเวลาด้วยปุ่ม TH / ENG ที่แถบด้านบน ระบบจะจดจำภาษาที่เลือกไว้บนอุปกรณ์นี้',
      'ส่วนโปรไฟล์ด้านล่างของแถบเมนูแสดงชื่อผู้ใช้ที่ลงชื่อเข้าใช้และบทบาท',
    ],
  },
  'dashboard': {
    intro_en:
      'The Dashboard is the landing page after sign-in. It summarises the whole census programme: headline counts, a breakdown of observations by type, and the health of the data pipeline.',
    intro_th:
      'แดชบอร์ดคือหน้าแรกหลังเข้าสู่ระบบ สรุปภาพรวมของโครงการสำมะโนทั้งหมด ทั้งตัวเลขสำคัญ สัดส่วนการสำรวจแยกตามประเภท และสถานะของระบบนำเข้าข้อมูล',
    steps_en: [
      'Read the stat cards at the top: Tree Stems, Plots, Species, BIOMASS (Komiyama AGB), and Submissions.',
      'The "Observations by Type" panel splits records into tree stems, seedlings, and woody debris.',
      'Check "System Status" for the BigQuery connection, Zoho Forms, and Cloud Ingestion — "Connected" means data is flowing; "Setup needed" means an administrator must act.',
      'The Live / Offline badge in the header tells you whether the portal is currently reaching the database.',
    ],
    steps_th: [
      'ดูการ์ดสถิติด้านบน: ลำต้นไม้ แปลงสำรวจ ชนิดพันธุ์ มวลชีวภาพ (Komiyama AGB) และการส่งข้อมูล',
      'แผง "การสำรวจแยกตามประเภท" แบ่งรายการเป็นลำต้นไม้ กล้าไม้ และเศษไม้',
      'ตรวจสอบ "สถานะระบบ" ทั้งการเชื่อมต่อ BigQuery, Zoho Forms และระบบนำเข้าข้อมูลคลาวด์ — "เชื่อมต่อแล้ว" หมายถึงข้อมูลไหลเข้าปกติ ส่วน "ต้องตั้งค่า" หมายถึงผู้ดูแลระบบต้องดำเนินการ',
      'ป้าย ออนไลน์ / ออฟไลน์ ที่ส่วนหัวบอกว่าพอร์ทัลเชื่อมต่อฐานข้อมูลได้อยู่หรือไม่',
    ],
    tips_en: ['If every card shows zero, load the Data page once so the observations table is populated.'],
    tips_th: ['หากการ์ดทุกใบแสดงค่าศูนย์ ให้เปิดหน้าข้อมูลหนึ่งครั้งเพื่อให้ระบบโหลดตารางการสำรวจ'],
  },
  'data-browse': {
    intro_en:
      'The Data page is the heart of the portal: a table of every census observation with keyword search, field-level filter conditions, a time frame, and full control over which columns are visible.',
    intro_th:
      'หน้าข้อมูลคือหัวใจของพอร์ทัล เป็นตารางรวมข้อมูลการสำรวจทั้งหมด พร้อมช่องค้นหา เงื่อนไขการกรองรายฟิลด์ ช่วงเวลา และการเลือกแสดง/ซ่อนคอลัมน์ได้อย่างอิสระ',
    steps_en: [
      'Type in the search box to match species, plot, collector, or remarks; results update after you press Apply or pause typing.',
      'Open "Filters" to add conditions: pick a field, an operator (contains, equals, is empty, etc.), and a value. Combine several conditions with "Add condition"; remove one with the ✕.',
      'Use "Time frame" to limit results by the record-added date — pick a begin and/or finish date; it applies automatically about 1.5 s after you choose.',
      'In "Fields", click a group header to show or hide all columns in that group, or click individual field chips to toggle them one by one.',
      'The Results bar tells you how many records matched and which filters produced them. Page through results with Previous / Next.',
      'Use the fullscreen button to expand the table, and the sun/moon button to switch the table between day and night mode.',
      'Press "Export XLSX" to download the current filtered records with the visible fields (see the note below about the record limit).',
    ],
    steps_th: [
      'พิมพ์ในช่องค้นหาเพื่อค้นชนิดพันธุ์ แปลง ผู้เก็บข้อมูล หรือหมายเหตุ ผลลัพธ์จะอัปเดตเมื่อกด "นำไปใช้" หรือหยุดพิมพ์ครู่หนึ่ง',
      'เปิด "ตัวกรอง" เพื่อเพิ่มเงื่อนไข: เลือกฟิลด์ ตัวดำเนินการ (มีคำว่า เท่ากับ ว่าง ฯลฯ) และค่า สามารถรวมหลายเงื่อนไขด้วย "เพิ่มเงื่อนไข" และลบด้วยปุ่ม ✕',
      'ใช้ "ช่วงเวลา" เพื่อจำกัดผลลัพธ์ตามวันที่บันทึกข้อมูล — เลือกวันที่เริ่มต้นและ/หรือวันที่สิ้นสุด ระบบจะนำไปใช้อัตโนมัติภายในประมาณ 1.5 วินาที',
      'ในส่วน "ฟิลด์" คลิกหัวข้อกลุ่มเพื่อแสดงหรือซ่อนคอลัมน์ทั้งกลุ่ม หรือคลิกฟิลด์ทีละรายการเพื่อสลับการแสดงผล',
      'แถบผลลัพธ์บอกจำนวนรายการที่พบและเงื่อนไขที่ใช้ เลื่อนดูหน้าถัดไปด้วยปุ่ม ก่อนหน้า / ถัดไป',
      'ใช้ปุ่มเต็มหน้าจอเพื่อขยายตาราง และปุ่มพระอาทิตย์/พระจันทร์เพื่อสลับโหมดกลางวัน-กลางคืนของตาราง',
      'กด "ส่งออก XLSX" เพื่อดาวน์โหลดรายการที่กรองอยู่พร้อมฟิลด์ที่แสดง (ดูหมายเหตุเรื่องจำนวนสูงสุดด้านล่าง)',
    ],
    tips_en: [
      'XLSX export is capped at 5,000 records — if the button is disabled, narrow the filters or keyword first.',
      'The exported workbook has two sheets: your records, plus a Data Dictionary sheet describing exactly the fields you exported.',
      'Filter value suggestions come from a dictionary generated from real data; the generation date is shown next to the filter panel.',
    ],
    tips_th: [
      'การส่งออก XLSX จำกัดที่ 5,000 รายการ — หากปุ่มถูกปิดใช้งาน ให้กรองข้อมูลหรือใช้คำค้นให้แคบลงก่อน',
      'ไฟล์ที่ส่งออกมีสองชีต: ข้อมูลรายการของคุณ และชีตพจนานุกรมข้อมูลที่อธิบายฟิลด์ที่ส่งออกทุกฟิลด์',
      'คำแนะนำค่าของตัวกรองมาจากพจนานุกรมที่สร้างจากข้อมูลจริง โดยแสดงวันที่สร้างไว้ข้างแผงตัวกรอง',
    ],
  },
  'data-insights': {
    intro_en:
      'Data Insight turns whatever is currently filtered on the Data page into an instant visual summary — counts, averages, and distribution charts — without leaving the page.',
    intro_th:
      'ข้อมูลเชิงลึกจะเปลี่ยนรายการที่กรองอยู่ในหน้าข้อมูลให้เป็นสรุปภาพทันที ทั้งจำนวน ค่าเฉลี่ย และแผนภูมิการกระจาย โดยไม่ต้องออกจากหน้าเดิม',
    steps_en: [
      'On the Data page, set up the search, filters, and time frame you are interested in.',
      'Click "View Data Insight" — the modal analyses exactly the records in your current view.',
      'Read the headline stats: record count, distinct species, distinct plots, average GBH, and average height.',
      'Scroll through the charts: observation types, top species, GBH distribution, live/dead vitality, size classes, crown condition, and records per plot.',
      'Open the Biomass tab for estimated tree biomass by species, project, and plot; switch the equation (Komiyama AGB, Komiyama AGB+BGB, or Chave) and tick "Add carbon" to see the numbers update live.',
      'Every chart in both tabs shows a Sum and an Avg of its bars underneath.',
      'Close the modal, adjust your filters, and open it again to compare a different slice of the data.',
    ],
    steps_th: [
      'ในหน้าข้อมูล ตั้งค่าคำค้น ตัวกรอง และช่วงเวลาที่ต้องการ',
      'คลิก "ดูข้อมูลเชิงลึก" — หน้าต่างจะวิเคราะห์เฉพาะรายการในมุมมองปัจจุบันของคุณ',
      'ดูสถิติหลัก: จำนวนรายการ จำนวนชนิดพันธุ์ จำนวนแปลง ค่า GBH เฉลี่ย และความสูงเฉลี่ย',
      'เลื่อนดูแผนภูมิ: ประเภทการสำรวจ ชนิดพันธุ์ที่พบมาก การกระจายของ GBH สภาพมีชีวิต/ตาย ชั้นขนาด สภาพเรือนยอด และจำนวนรายการต่อแปลง',
      'เปิดแท็บมวลชีวภาพเพื่อดูมวลชีวภาพประมาณการของต้นไม้ตามชนิดพันธุ์ โครงการ และแปลง เลือกสมการ (Komiyama AGB, Komiyama AGB+BGB หรือ Chave) และติ๊ก "เพิ่มคาร์บอน" เพื่อดูค่าที่เปลี่ยนแบบทันที',
      'แผนภูมิทุกอันในทั้งสองแท็บจะแสดงผลรวมและค่าเฉลี่ยของแท่งไว้ด้านล่าง',
      'ปิดหน้าต่าง ปรับตัวกรอง แล้วเปิดใหม่เพื่อเปรียบเทียบข้อมูลชุดอื่น',
    ],
    tips_en: [
      'GBH means girth at breast height, measured in centimetres.',
      'Biomass wood-density values are provisional and pending expert review — treat the biomass and carbon figures as indicative, not final.',
    ],
    tips_th: [
      'GBH คือเส้นรอบวงลำต้นที่ระดับอก มีหน่วยเป็นเซนติเมตร',
      'ค่าความหนาแน่นเนื้อไม้ที่ใช้คำนวณมวลชีวภาพเป็นค่าชั่วคราวและรอการตรวจสอบโดยผู้เชี่ยวชาญ — ให้ถือว่าค่ามวลชีวภาพและคาร์บอนเป็นเพียงค่าประมาณ',
    ],
  },
  'maps': {
    intro_en:
      'Maps & Statistics embeds the live Looker Studio census report, showing the geographic distribution of observations and programme statistics on an interactive map.',
    intro_th:
      'หน้าแผนที่และสถิติฝังรายงาน Looker Studio แบบเรียลไทม์ แสดงการกระจายเชิงพื้นที่ของข้อมูลการสำรวจและสถิติของโครงการบนแผนที่แบบโต้ตอบได้',
    steps_en: [
      'Open Maps & Statistics from the sidebar; the embedded Census Report loads automatically.',
      'Interact with the report directly — pan and zoom the map, and use any controls the report provides.',
      'For the full-size experience or to share the report, click "Open in Looker Studio".',
    ],
    steps_th: [
      'เปิดหน้าแผนที่และสถิติจากแถบเมนู รายงานสำมะโนที่ฝังไว้จะโหลดโดยอัตโนมัติ',
      'ใช้งานรายงานได้โดยตรง — เลื่อนและซูมแผนที่ รวมถึงใช้ตัวควบคุมต่าง ๆ ในรายงาน',
      'หากต้องการดูแบบเต็มจอหรือแชร์รายงาน คลิก "เปิดใน Looker Studio"',
    ],
  },
  'reports': {
    intro_en:
      'The Reports page is where census reports are generated, edited, and exported. The smart report builder supports six section types that can be combined into a document.',
    intro_th:
      'หน้ารายงานใช้สำหรับสร้าง แก้ไข และส่งออกรายงานสำมะโน เครื่องมือสร้างรายงานรองรับส่วนเนื้อหา 6 ประเภทที่นำมาประกอบเป็นเอกสารได้',
    steps_en: [
      'Open Reports from the sidebar (requires the Data Manager role or higher).',
      'Existing reports are listed under "Your Reports"; click "New Report" to start one.',
      'Compose a report from the section types: Summary Table (auto-generated from selected data), Chart (bar, pie, or line), Map Snapshot, Text Block, Image, and Signature.',
    ],
    steps_th: [
      'เปิดหน้ารายงานจากแถบเมนู (ต้องมีบทบาทผู้จัดการข้อมูลขึ้นไป)',
      'รายงานที่มีอยู่จะแสดงในส่วน "รายงานของคุณ" คลิก "สร้างรายงานใหม่" เพื่อเริ่มต้น',
      'ประกอบรายงานจากส่วนเนื้อหาต่าง ๆ ได้แก่ ตารางสรุป (สร้างอัตโนมัติจากข้อมูลที่เลือก) แผนภูมิ (แท่ง วงกลม หรือเส้น) ภาพแผนที่ บล็อกข้อความ รูปภาพ และลายเซ็น',
    ],
    tips_en: ['The full smart report generator arrives in Milestone 9 — until then this page previews the section types.'],
    tips_th: ['เครื่องมือสร้างรายงานอัจฉริยะฉบับสมบูรณ์จะมาใน Milestone 9 — ระหว่างนี้หน้านี้แสดงตัวอย่างประเภทส่วนเนื้อหา'],
  },
  'settings': {
    intro_en:
      'Settings is your personal account page: review your profile details and change your own password. Profile fields themselves are managed by administrators.',
    intro_th:
      'หน้าตั้งค่าคือหน้าบัญชีส่วนตัวของคุณ ใช้ตรวจสอบข้อมูลโปรไฟล์และเปลี่ยนรหัสผ่านของตนเอง ส่วนข้อมูลโปรไฟล์จะแก้ไขได้โดยผู้ดูแลระบบเท่านั้น',
    steps_en: [
      'Open Settings from the sidebar to see your Name, Email, and Role.',
      'To change your password, fill in "Current password", then the new password twice.',
      'The new password must be at least 8 characters, and both new-password fields must match.',
      'Press "Update password" — a green message confirms success.',
    ],
    steps_th: [
      'เปิดหน้าตั้งค่าจากแถบเมนูเพื่อดู ชื่อ อีเมล และบทบาทของคุณ',
      'หากต้องการเปลี่ยนรหัสผ่าน กรอก "รหัสผ่านปัจจุบัน" แล้วตามด้วยรหัสผ่านใหม่สองครั้ง',
      'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และช่องรหัสผ่านใหม่ทั้งสองช่องต้องตรงกัน',
      'กด "เปลี่ยนรหัสผ่าน" — ข้อความสีเขียวจะยืนยันเมื่อสำเร็จ',
    ],
    tips_en: ['Need your name, email, or role changed? Ask an administrator — those fields are locked for regular users.'],
    tips_th: ['หากต้องการแก้ไขชื่อ อีเมล หรือบทบาท โปรดติดต่อผู้ดูแลระบบ — ฟิลด์เหล่านี้ถูกล็อกสำหรับผู้ใช้ทั่วไป'],
  },
  'admin-users': {
    intro_en:
      'The Admin page (administrators only) manages user accounts. The Role Matrix explains what each of the five roles may do; the Users panel creates, edits, disables, and deletes accounts.',
    intro_th:
      'หน้าผู้ดูแลระบบ (เฉพาะผู้ดูแลระบบ) ใช้จัดการบัญชีผู้ใช้ ตารางสิทธิ์ตามบทบาทอธิบายสิทธิ์ของทั้ง 5 บทบาท ส่วนแผงผู้ใช้ใช้สร้าง แก้ไข ปิดใช้งาน และลบบัญชี',
    steps_en: [
      'Review the Role Matrix: Field User (form collection only), Data Viewer (read-only), Data Manager (+ editing and reports), Analyst (+ SQL), Admin (full access).',
      'Click "Add User", fill in name, email, password, and role, then press "Create user".',
      'Change a user\'s role with the role dropdown in their row.',
      'Click the status badge to toggle an account between active and disabled.',
      'Use the key icon to reset a user\'s password — share the new password over a secure channel.',
      'Use the bin icon to delete a user; deletion is permanent and asks for confirmation.',
    ],
    steps_th: [
      'ดูตารางสิทธิ์ตามบทบาท: ผู้เก็บข้อมูลภาคสนาม (เก็บข้อมูลผ่านฟอร์มเท่านั้น) ผู้ดูข้อมูล (อ่านอย่างเดียว) ผู้จัดการข้อมูล (+ แก้ไขและรายงาน) นักวิเคราะห์ (+ SQL) และผู้ดูแลระบบ (สิทธิ์เต็ม)',
      'คลิก "เพิ่มผู้ใช้" กรอกชื่อ อีเมล รหัสผ่าน และบทบาท แล้วกด "สร้างผู้ใช้"',
      'เปลี่ยนบทบาทของผู้ใช้ได้จากเมนูบทบาทในแถวของผู้ใช้นั้น',
      'คลิกป้ายสถานะเพื่อสลับบัญชีระหว่าง ใช้งาน และ ปิดใช้งาน',
      'ใช้ไอคอนกุญแจเพื่อรีเซ็ตรหัสผ่านของผู้ใช้ — ส่งรหัสผ่านใหม่ผ่านช่องทางที่ปลอดภัย',
      'ใช้ไอคอนถังขยะเพื่อลบผู้ใช้ การลบเป็นการถาวรและระบบจะขอคำยืนยันก่อน',
    ],
    tips_en: ['You cannot change your own role, disable your own account, or delete yourself — another admin must do it.'],
    tips_th: ['คุณไม่สามารถเปลี่ยนบทบาท ปิดใช้งาน หรือลบบัญชีของตนเองได้ — ต้องให้ผู้ดูแลระบบคนอื่นดำเนินการ'],
  },
  'audit': {
    intro_en:
      'The Audit Log (on the Admin page) records security-relevant events — sign-ins, user management actions, and data exports — so administrators can review who did what and when.',
    intro_th:
      'บันทึกกิจกรรม (ในหน้าผู้ดูแลระบบ) เก็บเหตุการณ์ด้านความปลอดภัย เช่น การเข้าสู่ระบบ การจัดการผู้ใช้ และการส่งออกข้อมูล เพื่อให้ผู้ดูแลระบบตรวจสอบได้ว่าใครทำอะไรเมื่อใด',
    steps_en: [
      'Open the Admin page and scroll to the Audit Log panel.',
      'Each row shows When the event happened, the Actor (who did it), the Action, the Target, and Details.',
      'Newest events appear first; use the log to investigate unexpected changes or access.',
    ],
    steps_th: [
      'เปิดหน้าผู้ดูแลระบบแล้วเลื่อนไปที่แผงบันทึกกิจกรรม',
      'แต่ละแถวแสดง เวลา ผู้ดำเนินการ การกระทำ เป้าหมาย และรายละเอียด',
      'เหตุการณ์ล่าสุดจะแสดงก่อน ใช้บันทึกนี้ตรวจสอบการเปลี่ยนแปลงหรือการเข้าถึงที่ผิดปกติ',
    ],
  },
  'ui-search': {
    intro_en:
      'The UI Search box at the bottom of the sidebar connects every label you see on screen to this guide. Type any button, column, or message text — in English or Thai — and it takes you straight to the manual section that explains it, with that label\'s mini guide already opened.',
    intro_th:
      'ช่องค้นหา UI ที่ด้านล่างของแถบเมนูเชื่อมโยงทุกป้ายชื่อบนหน้าจอเข้ากับคู่มือนี้ พิมพ์ข้อความของปุ่ม คอลัมน์ หรือข้อความใด ๆ ที่เห็น — ทั้งภาษาไทยหรืออังกฤษ — ระบบจะพาไปยังหัวข้อคู่มือที่อธิบายป้ายชื่อนั้น พร้อมเปิดคำอธิบายย่อให้อัตโนมัติ',
    steps_en: [
      'Click the search box under the menu items in the sidebar and start typing a label you saw on screen.',
      'Suggestions appear as you type, drawn from both the English and Thai names of every label — click one to jump straight to it.',
      'Or press Enter: the best match wins, and you land on its topic with the label row expanded and highlighted.',
      'If the box is empty or nothing matches, Enter brings you to this topic instead, so you can browse the topic list on the left.',
      'On the guide page itself: pick a topic on the left, read the intro and numbered steps, then use the label table below — the ▾ button on each row opens its UI Mini Guide.',
    ],
    steps_th: [
      'คลิกช่องค้นหาใต้เมนูในแถบด้านซ้าย แล้วพิมพ์ป้ายชื่อที่เห็นบนหน้าจอ',
      'คำแนะนำจะปรากฏขณะพิมพ์ โดยค้นจากชื่อป้ายทั้งภาษาไทยและอังกฤษ — คลิกรายการเพื่อไปยังป้ายนั้นทันที',
      'หรือกด Enter: ระบบจะเลือกรายการที่ตรงที่สุด และพาไปยังหัวข้อนั้นพร้อมขยายแถวของป้ายชื่อให้',
      'หากช่องว่างหรือไม่พบรายการที่ใกล้เคียง การกด Enter จะพามาที่หัวข้อนี้แทน เพื่อให้เลือกดูหัวข้ออื่นจากรายการด้านซ้าย',
      'ในหน้าคู่มือ: เลือกหัวข้อทางซ้าย อ่านคำนำและขั้นตอน แล้วใช้ตารางป้ายชื่อด้านล่าง — ปุ่ม ▾ ของแต่ละแถวจะเปิดคำอธิบายย่อ UI',
    ],
    tips_en: [
      'Search matches partial text too — typing "export" finds every export-related label.',
      'Administrators can edit any mini guide via the pencil button in the expanded row; the edited text is what everyone sees afterwards.',
    ],
    tips_th: [
      'การค้นหารองรับข้อความบางส่วน — พิมพ์ "ส่งออก" จะพบทุกป้ายชื่อที่เกี่ยวกับการส่งออก',
      'ผู้ดูแลระบบสามารถแก้ไขคำอธิบายย่อได้จากปุ่มดินสอในแถวที่ขยาย ข้อความที่แก้แล้วจะแสดงกับผู้ใช้ทุกคน',
    ],
  },
  'common': {
    intro_en:
      'A few controls behave the same everywhere in the portal, so they are documented once here.',
    intro_th:
      'ปุ่มควบคุมบางส่วนทำงานเหมือนกันทุกหน้าในพอร์ทัล จึงอธิบายรวมไว้ที่นี่ครั้งเดียว',
    steps_en: [
      '"Cancel" closes a dialog without saving anything.',
      '"Close" dismisses a modal or panel you have finished with.',
      '"Previous" and "Next" page through long tables 50 records at a time.',
    ],
    steps_th: [
      '"ยกเลิก" ปิดกล่องโต้ตอบโดยไม่บันทึกการเปลี่ยนแปลง',
      '"ปิด" ปิดหน้าต่างหรือแผงที่ใช้งานเสร็จแล้ว',
      '"ก่อนหน้า" และ "ถัดไป" เลื่อนดูตารางขนาดยาวครั้งละ 50 รายการ',
    ],
  },
  'data-flagging': {
    intro_en:
      'The Data Flagging & Verification System allows field workers to flag incorrect observations, suggest corrections, and let administrators approve or reject those edits to ensure high data quality.',
    intro_th:
      'ระบบการแจ้งแก้ไขและตรวจสอบข้อมูลช่วยให้ผู้ปฏิบัติงานภาคสนามสามารถแจ้งแก้ไขข้อมูลการสำรวจที่ไม่ถูกต้อง พร้อมทั้งเสนอแนะค่าใหม่ที่ถูกต้อง เพื่อให้ผู้ดูแลระบบตรวจสอบ อนุมัติ หรือปฏิเสธคำขอเหล่านั้น ซึ่งช่วยควบคุมคุณภาพของข้อมูลได้อย่างมีประสิทธิภาพ',
    steps_en: [
      'Navigate to the Data browser page and locate the incorrect observation row.',
      'Click the red warning/alert icon in the first column of the row to open the "Flag Incorrect Data" dialog.',
      'Select the specific field that contains the error (e.g. GBH, Height, Species) from the dropdown.',
      'Review the "Current Value" shown, then type the correct value in "Suggested Value".',
      'Provide a clear explanation of why the change is necessary under "Reason for correction", then click "Submit".',
      'The correction is sent to the admin verification queue. Once an administrator approves the request, the database will be automatically updated with the new value. If rejected, the data remains unchanged.'
    ],
    steps_th: [
      'ไปที่หน้าค้นหาข้อมูล (Data) และค้นหาแถวข้อมูลการสำรวจที่คิดว่าไม่ถูกต้อง',
      'คลิกไอคอนเครื่องหมายเตือนสีส้มแดง (AlertTriangle) ในคอลัมน์แรกเพื่อเปิดหน้าต่าง "แจ้งแก้ไขข้อมูล"',
      'เลือกฟิลด์ข้อมูลที่ต้องการแก้ไข (เช่น GBH, ความสูง, ชนิดพันธุ์) จากรายการตัวเลือก',
      'ตรวจสอบ "ค่าปัจจุบัน" ที่แสดงผล จากนั้นกรอกค่าที่ถูกต้องลงในช่อง "ค่าใหม่ที่เสนอ"',
      'กรอกคำอธิบายที่ชัดเจนเกี่ยวกับความจำเป็นในการแก้ไขในช่อง "เหตุผลที่แก้ไข" แล้วคลิก "ส่งข้อมูล"',
      'คำร้องขอแก้ไขจะถูกส่งไปยังคิวการตรวจสอบของแอดมิน เมื่อแอดมินอนุมัติ ฐานข้อมูลหลักจะได้รับการอัปเดตค่าใหม่โดยอัตโนมัติ หากปฏิเสธ ข้อมูลจะคงเดิม'
    ],
    tips_en: [
      'Only system fields (like record ID and submission ID) are locked; all other data variables can be flagged.',
      'Ensure you provide a clear reason or metadata references (like field photos) to help administrators approve the change quickly.'
    ],
    tips_th: [
      'เฉพาะฟิลด์ระบบที่ถูกล็อกไว้เท่านั้น (เช่น รหัสลำต้น และรหัสการส่งข้อมูล) ฟิลด์ข้อมูลสำรวจหลักอื่นๆ ทั้งหมดสามารถแจ้งแก้ไขได้',
      'โปรดป้อนเหตุผลที่ชัดเจน (เช่น อ้างอิงภาพถ่ายจากแปลงจริง) เพื่อช่วยให้ผู้ดูแลระบบตรวจสอบและอนุมัติคำร้องขอของคุณได้รวดเร็วยิ่งขึ้น'
    ],
  },
}
