/**
 * Overtime Secrets — Episode 1: "The First Scan (สำเนาที่ถูกลืม)"
 * Complete Interactive Story Manifest (Expanded Edition)
 */

import { VNProject } from '@/schema/types';
import { OVERTIME_CHARACTERS, OVERTIME_BACKGROUNDS } from './overtimeSecretsAssets';

export const OVERTIME_SECRETS_PROJECT: VNProject = {
  id: 'overtime_secrets_ep1',
  meta: {
    title: 'Overtime Secrets (แฟ้มลับกะดึก)',
    author: 'FrostNova Studios',
    version: '1.1.0',
    description: 'เกม Visual Novel แนวสืบสวนจิตวิทยา & Ecchi Romance ในออฟฟิศยามค่ำคืน',
    resolution: { width: 1920, height: 1080 }
  },
  characters: OVERTIME_CHARACTERS,
  backgrounds: OVERTIME_BACKGROUNDS,
  audio: {},
  initialVariables: {
    suspicion: 0,
    clearanceLevel: 'LV.1 GUEST',
    scannedCards: 0,
    noeyAffection: 0,
    hasNoeyID: false,
    hasPimID: false,
    unlockedKeycardHR: false,
    unlockedPhotos: 0,
    promptStyle: 'none'
  },
  startNodeId: 'node_start',
  nodes: {
    // -------------------------------------------------------------
    // Act 1: The Basement Server Room & The Echo Mind Terminal
    // -------------------------------------------------------------
    node_start: {
      id: 'node_start',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'เวลาสี่ทุ่มสิบห้านาที... ทั้งตึกสำนักงานใหญ่ปิดไฟเงียบสนิท เหลือแค่ผม "อาร์ม IT Support" ที่ต้องมานั่งหลังขดหลังแข็งเคลียร์สายแลนในห้องเซิร์ฟเวอร์ชั้นใต้ดินคนเดียวอีกแล้ว',
      nextId: 'node_monologue_1'
    },

    node_monologue_1: {
      id: 'node_monologue_1',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'ตอนกลางวันก็โดนทุกคนใช้เหมือนทาส "พี่อาร์ม ปริ้นเตอร์หมึกหมด", "ช่างอาร์ม แอร์ไม่เย็น", "เน็ตกระตุกทำอะไรอยู่"... ทั้งที่จริงๆ ความฝันและงานอดิเรกลับของผมคือ "การเป็นช่างภาพแนว Portrait & Cosplay" ที่ได้ถ่ายทอดความงดงามและเสน่ห์ของหญิงสาวแท้ๆ',
      nextId: 'node_discover_terminal'
    },

    node_discover_terminal: {
      id: 'node_discover_terminal',
      type: 'dialogue',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'shake',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'echo_mind', expression: 'normal', position: 'right', isSpeaking: true, animation: 'bounce' }
      ],
      text: 'กึก...! จู่ๆ หน้าจอมอนิเตอร์ CRT รุ่นเก่าในซอกหลืบตู้เซิร์ฟเวอร์ที่ไม่มีสายไฟเสียบอยู่ ก็สว่างวาบขึ้นมาเป็นแสงสีเขียวฟอสฟอรัสพร้อมเสียงพัดลมระบายความร้อนที่หมุนดังหวีดหวิว!',
      nextId: 'node_echo_intro'
    },

    node_echo_intro: {
      id: 'node_echo_intro',
      type: 'dialogue',
      speakerId: 'echo_mind',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'echo_mind', expression: 'normal', position: 'right', isSpeaking: true }
      ],
      text: '> ตรวจพบการเชื่อมต่อแบบ PHYSICAL... ระบบ AI "Echo Mind" v4.9 พร้อมทำงาน\n> ยินดีต้อนรับ "ผู้ดูแลระบบระดับสูงสุด (ROOT)" กรุณาระบุเป้าหมายเพื่อเริ่มกระบวนการแทรกแซงจิตใต้สำนึก',
      nextId: 'node_arm_confused'
    },

    node_arm_confused: {
      id: 'node_arm_confused',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: '"Echo Mind" งั้นเหรอ? ไวรัส? หรือมีใครทิ้งโปรเจกต์ AI ทดลองไว้ในเซิร์ฟเวอร์เก่าเครื่องนี้? แล้วที่บอกว่า "แทรกแซงจิตใต้สำนึก" นี่มันเรื่องบ้าอะไรกัน?',
      nextId: 'node_echo_rule'
    },

    node_echo_rule: {
      id: 'node_echo_rule',
      type: 'dialogue',
      speakerId: 'echo_mind',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'echo_mind', expression: 'normal', position: 'right', isSpeaking: true }
      ],
      text: '> กฎเหล็กของโปรโตคอล (THE CORE RULE):\n> ระบบจะปลดล็อกหน้าต่าง Terminal ของเป้าหมาย ก็ต่อเมื่อสแกน "บัตรประจำตัวประชาชนตัวจริง" ที่มีข้อมูลใบหน้าและเลขประจำตัว 13 หลักเท่านั้น!',
      nextId: 'node_arm_test_own_id'
    },

    node_arm_test_own_id: {
      id: 'node_arm_test_own_id',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: 'บัตรประชาชนงั้นเหรอ...? ถ้าของคนอื่นคงไม่มีหรอก แต่ถ้าลองเอา "บัตรประชาชนของตัวเอง" ในกระเป๋าตังค์มาจ่อหน้ากล้องสแกนดูล่ะ?',
      nextId: 'node_scan_own_id'
    },

    node_scan_own_id: {
      id: 'node_scan_own_id',
      type: 'dialogue',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'flash',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'echo_mind', expression: 'normal', position: 'right', isSpeaking: true }
      ],
      text: 'ติ๊ด! แสงเลเซอร์สีเขียวสแกนผ่านบัตรประชาชนของผม หน้าต่าง Terminal ประจำตัวผมเด้งขึ้นมาทันที!\n[เป้าหมาย: อาร์ม / ตำแหน่ง: IT Support]\n[สภาวะ: อ่อนเพลียสะสม, ปวดหลังเรื้อรังระดับ 8/10, ความเครียด 75%]\n> หน้าต่างคำสั่งพร้อมใช้งาน... กรุณาเลือกคำสั่งทดสอบแทรกแซงประสาท:',
      nextId: 'node_choice_self_test'
    },

    node_choice_self_test: {
      id: 'node_choice_self_test',
      type: 'choice',
      prompt: 'หน้าต่าง Terminal ของคุณเปิดขึ้นแล้ว คุณจะลองป้อนคำสั่งทดสอบอะไรกับตัวเอง?',
      options: [
        {
          id: 'test_recovery',
          label: '⚡ [คำสั่งฟื้นฟูร่างกาย: RECOVERY_ENERGY] ลบล้างความเมื่อยล้าสะสมและอาการปวดหลังเรื้อรังให้เป็นศูนย์',
          targetNodeId: 'node_self_test_recovery'
        },
        {
          id: 'test_focus',
          label: '🧠 [คำสั่งเร่งสมาธิขั้นสูง: HYPER_FOCUS] ปรับคลื่นสมองสู่สภาวะสงบนิ่ง เฉียบคม มองทะลุทุกสิ่ง',
          targetNodeId: 'node_self_test_focus'
        },
        {
          id: 'test_confidence',
          label: '💖 [คำสั่งปลุกความมั่นใจ: CONFIDENCE_BOOST] สลายความขี้อายและความกลัว เพิ่มความกล้าได้กล้าเสียเต็มร้อย',
          targetNodeId: 'node_self_test_confidence'
        }
      ]
    },

    node_self_test_recovery: {
      id: 'node_self_test_recovery',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'shake',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'เฮ้ย...!! คลื่นความอุ่นแล่นวาบผ่านกระดูกสันหลัง ความรู้สึกปวดเมื่อยที่สะบักกับเอวที่ทรมานผมมานับปีสลายไปจนหมดสิ้น! ร่างกายเบาหวิว หัวโล่งเหมือนเพิ่งนอนเต็มอิ่มมา 10 ชั่วโมงเต็ม!',
      nextId: 'node_own_id_result'
    },

    node_self_test_focus: {
      id: 'node_self_test_focus',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'flash',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'วิ้งงง! ประสาทสัมผัสของผมตื่นตัวขึ้นมาในเสี้ยววินาที! เสียงพัดลมเซิร์ฟเวอร์ เสียงหยดน้ำจากท่อแอร์ ทุกรายละเอียดในห้องมืดชัดเจนจนน่าขนลุก สมองประมวลผลเร็วกว่าปกติเป็นสิบเท่า!',
      nextId: 'node_own_id_result'
    },

    node_self_test_confidence: {
      id: 'node_self_test_confidence',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'shake',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'ตึกตัก! ก้อนเนื้อในอกเต้นรัวด้วยความฮึกเหิมอย่างที่ไม่เคยเป็นมาก่อน! ความรู้สึกประหม่า ขี้กลัว และยอมคนถูกแทนที่ด้วยความมั่นใจเปี่ยมล้น ผมรู้สึกพร้อมจะเผชิญหน้ากับทุกคนในบริษัท!',
      nextId: 'node_own_id_result'
    },

    node_own_id_result: {
      id: 'node_own_id_result',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true, animation: 'bounce' }],
      text: 'นี่มัน... ของจริง! Echo Mind ไม่ใช่แค่โปรแกรมหลอกเด็ก แต่มันสามารถแทรกแซงและเขียนทับสภาวะจิตใต้สำนึกของมนุษย์ได้ตามใจสั่งจริงๆ! และตอนนี้... ผู้ถือสิทธิ์ ROOT คือผมคนเดียว!',
      nextId: 'node_wrap_up_night'
    },

    node_wrap_up_night: {
      id: 'node_wrap_up_night',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'ผมปิดหน้าจอมอนิเตอร์ CRT เก็บสายไฟและพรางตู้เซิร์ฟเวอร์ไว้อย่างแนบเนียน... คืนนี้คงต้องกลับไปพักผ่อนก่อน พรุ่งนี้เช้า... เกมที่แท้จริงกำลังจะเริ่มต้นขึ้น!',
      nextId: 'node_day_transition'
    },

    // -------------------------------------------------------------
    // Act 2: Morning Ticket & The Recon at Marketing Floor
    // -------------------------------------------------------------
    node_day_transition: {
      id: 'node_day_transition',
      type: 'dialogue',
      backgroundId: 'bg_day_transition',
      cameraEffect: 'flash',
      characters: [],
      text: '☀️ [เช้าวันใหม่ — เวลา 08:30 น. ณ ตึกสำนักงานใหญ่]\nแสงแดดยามเช้าสาดส่องกระทบกระจกอาคารสูง บรรยากาศการทำงานอันเร่งรีบเริ่มต้นขึ้นอีกครั้ง แต่สำหรับผม... วันนี้จะไม่เหมือนเดิมอีกต่อไป เพราะ Echo Mind อยู่ในกำมือผมแล้ว!',
      nextId: 'node_next_morning'
    },

    node_next_morning: {
      id: 'node_next_morning',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_marketing_office',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'ติ๊งงง! เสียงแจ้งเตือน IT Ticket ดังขึ้นที่โต๊ะทำงานของผม: [Ticket #0402 - ด่วนมาก! จอคอมดับ เปิดไม่ติด / ผู้แจ้ง: น้องเนย แผนกการตลาด ชั้น 2]',
      nextId: 'node_arrive_marketing'
    },

    node_arrive_marketing: {
      id: 'node_arrive_marketing',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_marketing_office',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true, animation: 'bounce' }
      ],
      text: 'พี่อาร์มมม! มาพอดีเลย ช่วยเนยด้วยค่ะ! จู่ๆ จอคอมก็ดับไปเลย เนยกำลังพิมพ์รายงานสรุปผลงานส่งคุณพิมพ์ฝ่ายบุคคลอยู่นะคะ ถ้าส่งไม่ทันวันนี้เนยไม่ผ่านโปรแน่ๆ เลย ฮือออ...',
      nextId: 'node_arm_inspect_desk'
    },

    node_arm_inspect_desk: {
      id: 'node_arm_inspect_desk',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_marketing_office',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'noey', expression: 'normal', position: 'right' }
      ],
      text: 'ใจเย็นๆ ครับน้องเนย เดี๋ยวพี่มุดลงไปเช็กสายไฟกับรางปลั๊กใต้โต๊ะให้ น่าจะมีปลั๊กหลวมเฉยๆ ครับ',
      nextId: 'node_under_desk_scene'
    },

    node_under_desk_scene: {
      id: 'node_under_desk_scene',
      type: 'dialogue',
      backgroundId: 'bg_under_desk',
      text: 'ผมคุกเข่าแล้วมุดเข้าไปใต้โต๊ะทำงานไม้แคบๆ ของเนย... กลิ่นน้ำหอมกลิ่นพีชอ่อนๆ ของเธอยังลอยอบอวลอยู่ใต้โต๊ะ และตอนนั้นเอง สายตาของผมก็สะดุดเข้ากับบางสิ่ง!',
      nextId: 'node_spot_wallet'
    },

    node_spot_wallet: {
      id: 'node_spot_wallet',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_under_desk',
      text: 'ข้างรางปลั๊กไฟ มี "กระเป๋าสตางค์สีชมพู" ของเนยที่ตกอยู่... และที่ช่องใส่บัตร มีขอบ "บัตรประชาชนตัวจริง" โผล่ออกมาเห็นทั้งรูปถ่ายหน้าตรงและชื่อ-นามสกุลชัดเจน 100%!',
      nextId: 'node_choice_heist'
    },

    // -------------------------------------------------------------
    // Critical Choice: The ID Heist
    // -------------------------------------------------------------
    node_choice_heist: {
      id: 'node_choice_heist',
      type: 'choice',
      prompt: 'โอกาสสแกนบัตรประชาชนของน้องเนยอยู่ตรงหน้าแล้ว คุณจะทำอย่างไร?',
      options: [
        {
          id: 'opt_reckless',
          label: '⚡ [ใจร้อน] เอื้อมมือไปหยิบบัตรออกมาถ่ายรูปตอนนี้เลย!',
          targetNodeId: 'node_reckless_picked'
        },
        {
          id: 'opt_tactical',
          label: '🧠 [เหลี่ยม IT] บอกให้เนยกดปุ่มจอค้างไว้ 10 วินาที แล้วอาศัยจังหวะนี้แอบสแกน',
          targetNodeId: 'node_tactical_picked'
        },
        {
          id: 'opt_coward',
          label: '🛡️ [ปลอดภัย] ไม่กล้าเสี่ยง กลัวติดคุก คืนกระเป๋าให้เนยตามปกติ',
          targetNodeId: 'node_coward_picked'
        }
      ]
    },

    // Branch 1: BAD END (with Retry Checkpoint!)
    node_reckless_picked: {
      id: 'node_reckless_picked',
      type: 'set_variable',
      variableName: 'suspicion',
      operation: 'set',
      value: 100,
      nextId: 'node_bad_end_trigger'
    },

    node_bad_end_trigger: {
      id: 'node_bad_end_trigger',
      type: 'dialogue',
      backgroundId: 'bg_bad_end_pdpa',
      cameraEffect: 'shake',
      text: 'พรึ่บ! ด้วยความใจร้อน ผมรีบควักมือถือแล้วดึงบัตรประชาชนของเนยออกมาถ่ายรูปดื้อๆ... แต่เนยดันก้มหน้าลงมาใต้โต๊ะพอดี!',
      nextId: 'node_bad_end_dialogue'
    },

    node_bad_end_dialogue: {
      id: 'node_bad_end_dialogue',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_bad_end_pdpa',
      characters: [{ characterId: 'noey', expression: 'blush', position: 'center', isSpeaking: true }],
      text: 'กรี๊ดดดดดด!! พี่อาร์มทำอะไรน่ะคะ?! ทำไมเอามือถือมาแอบถ่ายบัตรประชาชนของเนย?! รปภ. ช่วยด้วยค่ะ มีคนพยายามขโมยข้อมูลส่วนบุคคล!!',
      nextId: 'node_game_over_pdpa'
    },

    node_game_over_pdpa: {
      id: 'node_game_over_pdpa',
      type: 'end',
      endingName: '🚨 BAD END: ละเมิดกฎหมาย PDPA & ถูกไล่ออกคาที่',
      message: 'คุณใจร้อนเกินไปจนถูกเนยจับได้คาหนังคาเขา ถูก รปภ. ควบคุมตัวและถูกไล่ออกทันที (สามารถกดปุ่ม "ลองใหม่อีกครั้ง" ด้านล่างเพื่อย้อนกลับไปจุดเริ่มซ่อมใต้โต๊ะได้ทันที)',
      retryNodeId: 'node_under_desk_scene'
    },

    // Branch 2: Coward
    node_coward_picked: {
      id: 'node_coward_picked',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_marketing_office',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'noey', expression: 'normal', position: 'right' }
      ],
      text: 'ผมลังเลจนไม่กล้าทำอะไร... สุดท้ายเลยหยิบกระเป๋าสตางค์คืนให้เนยไป เธอขอบคุณอย่างสุภาพ แต่โอกาสที่จะปลดล็อก Terminal ของเนยในครั้งนี้ก็หลุดลอยไปอย่างน่าเสียดาย',
      nextId: 'node_coward_end'
    },

    node_coward_end: {
      id: 'node_coward_end',
      type: 'end',
      endingName: '⌛ NORMAL END: พลาดโอกาสสแกนบัตร',
      message: 'คุณเลือกที่จะปลอดภัย แต่ไม่สามารถปลดล็อกความก้าวหน้าสู่ชั้นบนได้ (ลองกดย้อนกลับเพื่อเลือกใหม่)',
      retryNodeId: 'node_under_desk_scene'
    },

    // Branch 3: Tactical SUCCESS
    node_tactical_picked: {
      id: 'node_tactical_picked',
      type: 'set_variable',
      variableName: 'hasNoeyID',
      operation: 'set',
      value: true,
      nextId: 'node_tactical_execution'
    },

    node_tactical_execution: {
      id: 'node_tactical_execution',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_under_desk',
      text: '"เนยครับ ช่วยเอื้อมมือกดปุ่ม Power ที่หลังจอค้างไว้ประมาณ 10 วินาทีให้พี่หน่อยนะ พี่กำลังรีเซ็ตไฟอยู่!" เนยรีบตอบรับแล้วเอื้อมตัวขึ้นไปกดปุ่ม สายตาของเธอพ้นจากใต้โต๊ะโดยสมบูรณ์!',
      nextId: 'node_clean_photo_scan'
    },

    node_clean_photo_scan: {
      id: 'node_clean_photo_scan',
      type: 'dialogue',
      backgroundId: 'bg_under_desk',
      cameraEffect: 'flash',
      text: 'แชะ! กล้องมือถือของผมจับภาพหน้าบัตรประชาชนของเนยได้อย่างคมชัดระดับ 4K ตัวหนังสือและใบหน้าติดครบถ้วนทุกรายละเอียด! ผมเสียบสายไฟกลับเข้าที่อย่างแนบเนียน',
      nextId: 'node_monitor_repaired'
    },

    node_monitor_repaired: {
      id: 'node_monitor_repaired',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_marketing_office',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'normal', position: 'right', isSpeaking: true, animation: 'bounce' }
      ],
      text: 'ว้าววว! จอติดแล้ว! พี่อาร์มเก่งที่สุดเลยยย ขอบคุณมากนะคะ! เนยรอดตายแล้ววว!',
      nextId: 'node_night_server_room_again'
    },

    // -------------------------------------------------------------
    // Act 3: Night 1 — Echo Mind & The First Cosplay Photo Shoot
    // -------------------------------------------------------------
    node_night_server_room_again: {
      id: 'node_night_server_room_again',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: 'ตกดึกคืนนั้น... ผมกลับลงมาที่ห้องเซิร์ฟเวอร์ชั้นใต้ดิน เสียบสายส่งภาพบัตรประชาชนของเนยเข้าสู่ Echo Mind Terminal ทันที!',
      nextId: 'node_terminal_id_verify'
    },

    node_terminal_id_verify: {
      id: 'node_terminal_id_verify',
      type: 'dialogue',
      speakerId: 'echo_mind',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'flash',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'echo_mind', expression: 'normal', position: 'right', isSpeaking: true }
      ],
      text: '> ตรวจสอบอัตลักษณ์สำเร็จ! [เป้าหมาย: น.ส. ณัฐมน (เนย) / แผนกการตลาด / อายุ 21 ปี]\n> สภาวะจิตใจ: วิตกกังวลเรื่องผลประเมินงาน, ชอบการแต่งตัวน่ารักแต่ไม่กล้าแสดงออก\n> ปลดล็อกหน้าต่าง Terminal ของเป้าหมายแล้ว! พร้อมรับคำสั่งแทรกแซง...',
      nextId: 'node_arm_hobby_thought'
    },

    node_arm_hobby_thought: {
      id: 'node_arm_hobby_thought',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'ผมนึกถึงกล้อง Mirrorless ตัวโปรดที่ผมแอบเก็บไว้ในล็อกเกอร์ห้องไอที... ผมใฝ่ฝันอยากถ่ายภาพสาวน่ารักๆ ในชุดคอสเพลย์มาตลอด และตอนนี้หน้าต่างควบคุมของน้องเนยอยู่ในกำมือผมแล้ว!',
      nextId: 'node_choice_terminal_prompt'
    },

    node_choice_terminal_prompt: {
      id: 'node_choice_terminal_prompt',
      type: 'choice',
      prompt: 'หน้าต่าง Terminal ของน้องเนยพร้อมรับคำสั่งแล้ว... คุณจะป้อนคำสั่งกระตุ้นความปรารถนาเบื้องลึกแบบไหน?',
      options: [
        {
          id: 'prompt_catmaid',
          label: '🎭 [สายปลดปล่อยตัวตนลับ: SECRET_PASSION] สั่งให้ปลดล็อกความฝันลับ สวมชุด Sexy Cosplay ที่แอบเก็บไว้แต่ไม่เคยกล้าใส่ มาให้อาร์มถ่ายรูปเป็นที่ระลึก',
          targetNodeId: 'node_prompt_catmaid_execute'
        },
        {
          id: 'prompt_confidant',
          label: '💖 [สายเปิดใจใกล้ชิด: SWEET_SURRENDER] สั่งให้คลายกังวลเรื่องงาน มองอาร์มเป็นที่พึ่งพิง และเลือกชุดคอสเพลย์ที่น่ารักที่สุดมาอ้อนสองต่อสอง',
          targetNodeId: 'node_prompt_confidant_execute'
        },
        {
          id: 'prompt_seductive',
          label: '🔥 [สายเย้ายวนชวนเซอร์ไพรส์: ALLURING_REVEAL] สั่งให้ปลดล็อกความกล้าหาญ เซอร์ไพรส์อาร์มด้วยชุดเซ็กซี่คอสเพลย์ที่กล้าที่สุดในตู้เสื้อผ้า',
          targetNodeId: 'node_prompt_seductive_execute'
        }
      ]
    },

    node_prompt_catmaid_execute: {
      id: 'node_prompt_catmaid_execute',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: 'ผมพิมพ์คำสั่งลงไปใน Echo Mind:\n> TARGET: [น้องเนย]\n> TRIGGER: [หลังเลิกงาน 2 ทุ่ม มาพบอาร์มที่ห้องเซิร์ฟเวอร์ชั้นใต้ดิน]\n> DESIRE: [ปลดปล่อยตัวตนลับ สวม \'ชุด Sexy Cosplay\' ในฝันที่แอบเก็บไว้ มาให้อาร์มช่วยถ่ายรูปเป็นที่ระลึกอย่างมีความสุข]\n\nผมไม่ได้ระบุเจาะจงว่าต้องเป็นชุดอะไร... ปล่อยให้จิตใต้สำนึกของเนยเลือกชุดที่เธอปรารถนาจะใส่ที่สุด แล้วมารอดูกันว่าสองทุ่มคืนนี้ เธอจะเซอร์ไพรส์ผมด้วยชุดแบบไหน!',
      nextId: 'node_catmaid_injection'
    },

    node_prompt_confidant_execute: {
      id: 'node_prompt_confidant_execute',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: 'ผมพิมพ์คำสั่งลงไปใน Echo Mind:\n> TARGET: [น้องเนย]\n> TRIGGER: [หลังเลิกงาน 2 ทุ่ม มาพบอาร์มที่ห้องเซิร์ฟเวอร์ชั้นใต้ดิน]\n> DESIRE: [คลายความกังวลเรื่องงาน มองอาร์มเป็นที่พึ่งพิงอันอบอุ่น เลือก \'ชุด Sexy Cosplay\' ที่น่ารักที่สุดมาให้อาร์มถ่ายรูปอย่างไว้วางใจ]\n\nผมเว้นว่างชื่อชุดไว้ ให้จิตใต้สำนึกอันอ่อนไหวของเนยเป็นคนเลือกหยิบชุดในฝันออกมาเอง... สองทุ่มคืนนี้เธอจะใส่ชุดอะไรมานะ?',
      nextId: 'node_catmaid_injection'
    },

    node_prompt_seductive_execute: {
      id: 'node_prompt_seductive_execute',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: 'ผมพิมพ์คำสั่งลงไปใน Echo Mind:\n> TARGET: [น้องเนย]\n> TRIGGER: [หลังเลิกงาน 2 ทุ่ม มาพบอาร์มที่ห้องเซิร์ฟเวอร์ชั้นใต้ดิน]\n> DESIRE: [ปลดล็อกความกล้าแสดงออก เซอร์ไพรส์อาร์มด้วย \'ชุด Sexy Cosplay\' ที่กล้าหาญและเร่าร้อนที่สุดในตู้เสื้อผ้า]\n\nผมส่งคำสั่งกว้างๆ ไปยังสมองส่วนลึก ให้เธอเป็นคนเลือกเปิดเผยด้านที่เย้ายวนที่สุดออกมาเอง... ลุ้นจนแทบรอถึงสองทุ่มไม่ไหวแล้ว!',
      nextId: 'node_catmaid_injection'
    },

    node_catmaid_injection: {
      id: 'node_catmaid_injection',
      type: 'dialogue',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'shake',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'echo_mind', expression: 'normal', position: 'right', isSpeaking: true }
      ],
      text: 'ตึ้งงงงง! คลื่นแสงสีเขียวแล่นวาบผ่านโครงข่าย: > SYNAPSE_OVERRIDE_COMPLETE! คำสั่งถูกฝังลงในสมองส่วนลึกของเนยเรียบร้อยแล้ว!',
      nextId: 'node_noey_arrives_catmaid'
    },

    node_noey_arrives_catmaid: {
      id: 'node_noey_arrives_catmaid',
      type: 'dialogue',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true, animation: 'bounce' }
      ],
      text: 'สองทุ่มตรง... เสียงหัวใจผมเต้นระทึก ประตูห้องเซิร์ฟเวอร์ค่อยๆ แง้มออก... และร่างที่ก้าวเข้ามาก็ทำให้ผมตาค้างจนแทบหยุดหายใจ!\nบนศีรษะของเนยมีหูแมวสีดำฟูฟ่อง เธอสวมชุดเมดสีดำลูกไม้กระโปรงสั้นจู๋ ปลอกคอผูกกระดิ่งทอง และถุงน่องซีทรูสีดำแนบเนื้อเนียน... นี่คือชุดคอสเพลย์แมวเหมียวแสนซนที่เธอแอบเก็บซ่อนไว้ในตู้เสื้อผ้า!',
      nextId: 'node_noey_catmaid_talk'
    },

    node_noey_catmaid_talk: {
      id: 'node_noey_catmaid_talk',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true }
      ],
      text: 'พะ... พี่อาร์มคะ... ตะลึงไปเลยเหรอคะ... ชุดนี้เนยแอบซื้อเก็บไว้ตั้งนานแล้ว แต่ไม่เคยมีความกล้าหยิบมาใส่ให้ใครเห็นเลยสักครั้ง... แต่ในใจเนยตอนเลิกงาน มันร่ำร้องว่าอยากสวมชุดแมวเหมียวชุดนี้มาให้พี่อาร์มถ่ายรูปให้ดูคนเดียวในคืนนี้... เหมียววว... พอเนยใส่ชุดนี้แล้ว ดูน่ารักเซ็กซี่ถูกใจพี่อาร์มไหมคะ?',
      nextId: 'node_choice_photo_pose'
    },

    node_choice_photo_pose: {
      id: 'node_choice_photo_pose',
      type: 'choice',
      prompt: 'คุณหยิบกล้องคู่ใจขึ้นมาจัดแสงไฟในห้องเซิร์ฟเวอร์ คุณจะสั่งให้น้องเนยโพสท่าไหน?',
      options: [
        {
          id: 'pose_cute',
          label: '🐾 [สายหวานละมุนขี้อ้อน] ให้เนยยกสองมือทำท่าอุ้งเท้าแมว เอียงคอส่งยิ้มหวานหน้าแดง',
          targetNodeId: 'node_take_photo_cute'
        },
        {
          id: 'pose_sensual',
          label: '🔥 [สายเซ็กซี่กระชากใจ] ให้เนยนั่งคุกเข่าบนเก้าอี้ หันหลังแล้วเอี้ยวคอช้อนตามองข้ามไหล่',
          targetNodeId: 'node_take_photo_sensual'
        },
        {
          id: 'pose_playful',
          label: '📸 [สายธรรมชาติขี้เล่น] ให้เนยแกล้งย่องเข้ามาใกล้หน้าเลนส์ สองมือจับหูแมวแล้วส่งสายตาทะเล้นปนเขิน',
          targetNodeId: 'node_take_photo_playful'
        }
      ]
    },

    node_take_photo_cute: {
      id: 'node_take_photo_cute',
      type: 'dialogue',
      backgroundId: 'bg_cg_noey_catmaid',
      cameraEffect: 'flash',
      text: 'แชะ! แชะ! เสียงชัตเตอร์กล้องลั่นรัวๆ เนยยกอุ้งมือน้อยๆ ขึ้นมาข้างแก้ม หน้าแดงแปร๊ดด้วยความเอียงอาย แต่สายตากลับจ้องมองเลนส์ของผมอย่างไม่ละสายตา... ท่าทางขี้อ้อนน่ารักดั่งลูกแมวน้อยทำเอาใจผมเต้นระรัว!',
      nextId: 'node_gain_photo_1'
    },

    node_take_photo_sensual: {
      id: 'node_take_photo_sensual',
      type: 'dialogue',
      backgroundId: 'bg_cg_noey_catmaid',
      cameraEffect: 'flash',
      text: 'แชะ! แชะ! เนยนั่งคุกเข่าเผยให้เห็นส่วนโค้งเว้าของสะโพกและแผ่นหลังเนียนขาว สายตาหวานฉ่ำทอดมองข้ามไหล่ตรงมายังกล้องของผม... เป็นภาพที่มีเสน่ห์เร่าร้อนจนผมต้องกลืนน้ำลาย!',
      nextId: 'node_gain_photo_1'
    },

    node_take_photo_playful: {
      id: 'node_take_photo_playful',
      type: 'dialogue',
      backgroundId: 'bg_cg_noey_catmaid',
      cameraEffect: 'flash',
      text: 'แชะ! แชะ! เนยย่อตัวย่องเข้ามาประชิดหน้าเลนส์ สองมือจับหูแมวฟูฟ่องพร้อมส่งสายตาทะเล้นปนขี้อาย... จังหวะภาพที่แสนเป็นธรรมชาติและมีชีวิตชีวา ทำเอาทั้งห้องอบอวลไปด้วยรอยยิ้ม!',
      nextId: 'node_gain_photo_1'
    },

    node_gain_photo_1: {
      id: 'node_gain_photo_1',
      type: 'set_variable',
      variableName: 'noeyAffection',
      operation: 'add',
      value: 4,
      nextId: 'node_add_photo_count_1'
    },

    node_add_photo_count_1: {
      id: 'node_add_photo_count_1',
      type: 'set_variable',
      variableName: 'unlockedPhotos',
      operation: 'add',
      value: 1,
      nextId: 'node_photo_1_saved'
    },

    node_photo_1_saved: {
      id: 'node_photo_1_saved',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true }],
      text: 'ผมบันทึกรูปชุดแมวเหมียวสุดน่ารักของเนยเก็บเข้า "แฟ้มสะสมภาพถ่ายลับส่วนตัว" เรียบร้อยแล้ว เนยดูรูปในจอกล้องแล้วยิ้มเขินๆ พลางจับมือผมแน่นขึ้น... ความผูกพันของเนยเพิ่มขึ้นเป็น 4/10!',
      nextId: 'node_day2_hr_incident'
    },

    // -------------------------------------------------------------
    // Act 4: Day 2 — The HR Bullying Incident (Pim's Tyranny)
    // -------------------------------------------------------------
    node_day2_hr_incident: {
      id: 'node_day2_hr_incident',
      type: 'dialogue',
      backgroundId: 'bg_hr_corridor',
      text: 'วันถัดมา เวลา 11:30 น. ขณะที่ผมกำลังยกกล่องหมึกปริ้นเตอร์ผ่านหน้าห้องฝ่ายบุคคล (HR) ชั้น 4... จู่ๆ เสียงตวาดแหลมคมของ "คุณพิมพ์ ผู้จัดการ HR สาวแว่นสุดเฮี้ยบ" ก็ดังสนั่นโถงทางเดิน!',
      nextId: 'node_pim_scolding'
    },

    node_pim_scolding: {
      id: 'node_pim_scolding',
      type: 'dialogue',
      speakerId: 'pim',
      backgroundId: 'bg_hr_corridor',
      characters: [
        { characterId: 'pim', expression: 'strict', position: 'left', isSpeaking: true },
        { characterId: 'noey', expression: 'blush', position: 'right' }
      ],
      text: 'คุณณัฐมน! รายงานเอกสารแค่ 3 หน้านี่คุณจัดหน้ากระดาษยังไง?! ฟอนต์ก็ผิด ย่อหน้าก็เบี้ยว! ถ้าแค่เอกสารพื้นฐานยังทำไม่ได้เรื่อง สิ้นเดือนนี้เตรียมเก็บของออกไปได้เลยนะ ฉันไม่ให้คุณผ่านโปรแน่นอน!',
      nextId: 'node_pim_berates_arm'
    },

    node_pim_berates_arm: {
      id: 'node_pim_berates_arm',
      type: 'dialogue',
      speakerId: 'pim',
      backgroundId: 'bg_hr_corridor',
      characters: [
        { characterId: 'pim', expression: 'strict', position: 'left', isSpeaking: true },
        { characterId: 'arm', expression: 'normal', position: 'right' }
      ],
      text: 'คุณพิมพ์หันขวับมาทางผมด้วยสายตาเหยียดหยาม: "แล้วนายน่ะ ช่างไอที! มัวแต่เดินเตร็ดเตร่อะไรอยู่ตรงนี้?! งานซ่อมบำรุงเซิร์ฟเวอร์รายงานมาถึงฉันช้ามาก ถ้านายยังทำตัวไร้ประสิทธิภาพ ฉันจะตัดค่าล่วงเวลาทิ้งให้หมด!"',
      nextId: 'node_pim_storms_off'
    },

    node_pim_storms_off: {
      id: 'node_pim_storms_off',
      type: 'dialogue',
      backgroundId: 'bg_hr_corridor',
      characters: [
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true },
        { characterId: 'arm', expression: 'normal', position: 'left' }
      ],
      text: 'คุณพิมพ์เดินสะบัดบ็อบเข้าห้องทำงานส่วนตัวแล้วปิดประตูดังปัง! เนยยืนก้มหน้าร้องไห้น้ำตาหยดแหมะๆ อยู่ตรงมุมทางเดิน ตัวสั่นเทาด้วยความอับอายและสิ้นหวัง...',
      nextId: 'node_arm_comforts_noey'
    },

    node_arm_comforts_noey: {
      id: 'node_arm_comforts_noey',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_hr_corridor',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'noey', expression: 'blush', position: 'right' }
      ],
      text: 'ผมเดินเข้าไปใกล้ ดึงกระดาษทิชชู่ออกมาซับน้ำตาให้เนยเบาๆ: "เนย... อย่าร้องเลยนะ ยัยคุณพิมพ์นั่นแค่ชอบใช้อำนาจกดขี่คนอื่น รายงานของเนยไม่ได้แย่ขนาดนั้นสักนิด... พี่จะไม่ยอมให้ใครมาไล่เนยออกเด็ดขาด"',
      nextId: 'node_noey_touching_reply'
    },

    node_noey_touching_reply: {
      id: 'node_noey_touching_reply',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_hr_corridor',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true }
      ],
      text: 'ฮึก... ขอบคุณนะคะพี่อาร์ม... มีแค่พี่อาร์มคนเดียวจริงๆ ที่ใจดีกับเนย... เนยอยากเอาคืนยัยคุณพิมพ์นั่นจังเลยค่ะ แต่เด็กฝึกงานต็อกต๋อยอย่างเนยจะไปทำอะไรได้...',
      nextId: 'node_arm_revenge_plan'
    },

    node_arm_revenge_plan: {
      id: 'node_arm_revenge_plan',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_hr_corridor',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'noey', expression: 'blush', position: 'right' }
      ],
      text: 'ผมกระซิบบอกเนยด้วยแววตามุ่งมั่น: "ทำได้สิเนย... พี่มีแผนจะจัดการคุณพิมพ์ แต่พี่ต้องขอให้เนยเชื่อใจพี่ และร่วมมือกับพี่นะ คืนนี้มาเจอพี่ที่ห้องเดิมอีกครั้งนะเนย"',
      nextId: 'node_gain_affection_shared_bond'
    },

    node_gain_affection_shared_bond: {
      id: 'node_gain_affection_shared_bond',
      type: 'set_variable',
      variableName: 'noeyAffection',
      operation: 'add',
      value: 3,
      nextId: 'node_night2_server_room'
    },

    // -------------------------------------------------------------
    // Act 5: Night 2 — Deep Trust & Midnight Silk Lingerie Session
    // -------------------------------------------------------------
    node_night2_server_room: {
      id: 'node_night2_server_room',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left', isSpeaking: true },
        { characterId: 'echo_mind', expression: 'normal', position: 'right' }
      ],
      text: 'สี่ทุ่มคืนที่สอง... ผมยืนอยู่หน้า Echo Mind ค่าความผูกพันของเนยอยู่ที่ 7/10 แล้ว! ครั้งนี้ผมสั่งคำสั่งยกระดับจิตใจขั้นลึกซึ้ง:\n> DESIRE: [เปิดเผยความจริงใจและความงดงามที่แท้จริง มอบความไว้วางใจสูงสุดให้อาร์มเพียงผู้เดียว]',
      nextId: 'node_noey_arrives_lingerie'
    },

    node_noey_arrives_lingerie: {
      id: 'node_noey_arrives_lingerie',
      type: 'dialogue',
      backgroundId: 'bg_server_room_dark',
      cameraEffect: 'flash',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true }
      ],
      text: 'ประตูเปิดออกอีกครั้ง... คราวนี้เนยมาในชุดที่ทำให้ลมหายใจของผมแทบสะดุด! เธอสวมเสื้อเชิ้ตสีขาวตัวโคร่งที่ปลดกระดุมบนออกจนเผยให้เห็น "ชุดชั้นในลูกไม้สีดำสนิท" แนบเนื้อ ผิวขาวเนียนฉ่ำวาวใต้แสงไฟสลัว...',
      nextId: 'node_noey_confession'
    },

    node_noey_confession: {
      id: 'node_noey_confession',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true }
      ],
      text: 'พี่อาร์มคะ... เนยต้องส่งเสียน้องสาวเรียนหนังสือ เนยถึงอยากผ่านโปรที่นี่มาก... แต่ตั้งแต่เนยได้เจอพี่อาร์ม เนยรู้สึกว่าในตึกที่เย็นชาแห่งนี้ มีพี่อาร์มเป็นที่พึ่งคนเดียวที่อบอุ่นและไว้ใจได้... คืนนี้ช่วยเก็บภาพความทรงจำพิเศษให้เนยอีกสักชุดนะคะ...',
      nextId: 'node_choice_night2_pose'
    },

    node_choice_night2_pose: {
      id: 'node_choice_night2_pose',
      type: 'choice',
      prompt: 'ในบรรยากาศเงียบสงบยามดึก คุณจะจัดมุมกล้องและสั่งให้น้องเนยโพสท่าสไตล์ไหน?',
      options: [
        {
          id: 'night2_romantic',
          label: '✨ [มุมแสงเงาโรแมนติก] ให้เนยยืนพิงตู้เซิร์ฟเวอร์ แสงไฟสลัวตกกระทบไหล่เนียน ช้อนตามองกล้องอย่างอ่อนโยน',
          targetNodeId: 'node_cg_noey_lingerie_romantic'
        },
        {
          id: 'night2_alluring',
          label: '🌹 [มุมใกล้ชิดชวนใจเต้น] ให้เนยปลดกระดุมเสื้อเชิ้ตลงเล็กน้อย เอียงคอส่งสายตาหวานซึ้งชวนหลงใหล',
          targetNodeId: 'node_cg_noey_lingerie_alluring'
        },
        {
          id: 'night2_intimate',
          label: '💫 [มุมอ้อนระยะประชิด] ให้เนยก้าวเข้ามาใกล้ตัว ยื่นมือมาแตะขอบเลนส์กล้องด้วยรอยยิ้มเขินอาย',
          targetNodeId: 'node_cg_noey_lingerie_intimate'
        }
      ]
    },

    node_cg_noey_lingerie_romantic: {
      id: 'node_cg_noey_lingerie_romantic',
      type: 'dialogue',
      backgroundId: 'bg_cg_noey_lingerie',
      cameraEffect: 'flash',
      text: 'แชะ! แชะ! แสงไฟสีฟ้าอมเขียวจากเซิร์ฟเวอร์ตัดกับผิวขาวเนียนของเนยอย่างลงตัว แววตาที่เธอมองมาเต็มเปี่ยมไปด้วยความรู้สึกซาบซึ้งและหลงใหล จนหัวใจของผมเต้นแรงไม่เป็นจังหวะ!',
      nextId: 'node_max_affection_reach'
    },

    node_cg_noey_lingerie_alluring: {
      id: 'node_cg_noey_lingerie_alluring',
      type: 'dialogue',
      backgroundId: 'bg_cg_noey_lingerie',
      cameraEffect: 'flash',
      text: 'แชะ! แชะ! เสื้อเชิ้ตสีขาวเลื่อนหลุดจากลาดไหล่เนียน เผยเสน่ห์อันน่าค้นหาในยามค่ำคืน ลมหายใจอุ่นๆ และสายตาหวานฉ่ำของเนยสะกดผมไว้จนแทบละสายตาจากช่องมองภาพไม่ได้!',
      nextId: 'node_max_affection_reach'
    },

    node_cg_noey_lingerie_intimate: {
      id: 'node_cg_noey_lingerie_intimate',
      type: 'dialogue',
      backgroundId: 'bg_cg_noey_lingerie',
      cameraEffect: 'flash',
      text: 'แชะ! แชะ! เนยขยับเข้ามาใกล้จนได้กลิ่นหอมอ่อนๆ จากเรือนผม ปลายนิ้วเรียวแตะขอบเลนส์เบาๆ พร้อมรอยยิ้มหวานซึ้ง เป็นภาพถ่ายระยะประชิดที่ทรงพลังและตราตรึงใจที่สุด!',
      nextId: 'node_max_affection_reach'
    },

    node_max_affection_reach: {
      id: 'node_max_affection_reach',
      type: 'set_variable',
      variableName: 'noeyAffection',
      operation: 'set',
      value: 10,
      nextId: 'node_add_photo_count_2'
    },

    node_add_photo_count_2: {
      id: 'node_add_photo_count_2',
      type: 'set_variable',
      variableName: 'unlockedPhotos',
      operation: 'add',
      value: 1,
      nextId: 'node_noey_gives_hr_keycard'
    },

    // -------------------------------------------------------------
    // Act 6: The HR Infiltration Heist & Keycard Handover
    // -------------------------------------------------------------
    node_noey_gives_hr_keycard: {
      id: 'node_noey_gives_hr_keycard',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true }
      ],
      text: 'เนยสวมกอดผมจากด้านหลัง ลมหายใจอุ่นๆ รดต้นคอ พลางหยิบบัตรพลาสติกเคลือบซองใสออกมาใส่มือผมอย่างสั่นเทา:\n"พี่อาร์มคะ... เมื่อตอนเย็นก่อนเลิกงาน คุณพิมพ์สั่งให้เนยไปยกแฟ้มเอกสารในห้องส่วนตัว แล้วเธอรีบออกไปพบลูกค้าจนลืมกระเป๋าสตางค์ทิ้งไว้บนโต๊ะ... เนยจำได้ว่าพี่อาร์มบอกว่าจะหาวิธีจัดการคุณพิมพ์... เนยเลยแอบหยิบสิ่งนี้มาให้พี่อาร์มค่ะ... บัตรประจำตัวประชาชนตัวจริงของคุณพิมพ์!"',
      nextId: 'node_revenge_promise'
    },

    node_revenge_promise: {
      id: 'node_revenge_promise',
      type: 'dialogue',
      speakerId: 'noey',
      backgroundId: 'bg_server_room_dark',
      characters: [
        { characterId: 'arm', expression: 'normal', position: 'left' },
        { characterId: 'noey', expression: 'blush', position: 'right', isSpeaking: true }
      ],
      text: '"ถ้าพรุ่งนี้เช้าคุณพิมพ์รู้ว่าบัตร ปชช. หายไป เธอต้องอาละวาดบ้านแตกแน่ๆ... แต่เนยเชื่อใจพี่อาร์มนะคะ เนยยอมขโมยมันมาให้เพราะเนยอยากช่วยพี่อาร์มจริงๆ... คืนนี้พี่อาร์มรีบใช้มันทำอะไรสักอย่างเถอะนะคะ ก่อนที่พรุ่งนี้เช้าเรื่องจะแตก!"',
      nextId: 'node_set_hr_key_unlocked'
    },

    node_set_hr_key_unlocked: {
      id: 'node_set_hr_key_unlocked',
      type: 'set_variable',
      variableName: 'hasPimID',
      operation: 'set',
      value: true,
      nextId: 'node_add_scanned_card'
    },

    node_add_scanned_card: {
      id: 'node_add_scanned_card',
      type: 'set_variable',
      variableName: 'scannedCards',
      operation: 'set',
      value: 1,
      nextId: 'node_stage1_success_monologue'
    },

    node_stage1_success_monologue: {
      id: 'node_stage1_success_monologue',
      type: 'dialogue',
      speakerId: 'arm',
      backgroundId: 'bg_server_room_dark',
      characters: [{ characterId: 'arm', expression: 'normal', position: 'center', isSpeaking: true, animation: 'bounce' }],
      text: 'พระเจ้าช่วย...! ในมือของผมตอนนี้คือ "บัตรประจำตัวประชาชนตัวจริงของคุณพิมพ์" ผู้จัดการฝ่ายบุคคลสาวแว่นสุดเฮี้ยบ! ภาพถ่ายหน้าตรงสุดเฉียบและเลข 13 หลักเด่นหราอยู่ตรงหน้า!\nด้วยบัตรใบนี้... คืนนี้ผมสามารถเสียบมันเข้ากับ Echo Mind เพื่อเจาะลึกเข้าไปในจิตใต้สำนึกและค้นหาปมความลับดำมืดของคุณพิมพ์ได้ทันที!\nการสั่งสอนผู้จัดการ HR จอมโหด... กำลังจะเปิดฉากขึ้นใน Chapter 2 แล้ว!',
      nextId: 'node_stage1_complete'
    },

    node_stage1_complete: {
      id: 'node_stage1_complete',
      type: 'end',
      endingName: '🎉 STAGE 1 COMPLETE: THE FIRST SCAN CLEARED!',
      message: 'ยินดีด้วย! คุณพิชิตเป้าหมายที่ 1 "น้องเนย" สำเร็จ (ความผูกพัน 10/10 เต็ม + ปลดล็อกภาพถ่าย 2 ภาพในแกลเลอรี) และได้รับ "บัตร ปชช. คุณพิมพ์ HR" เพื่อส่งต่อความตื่นเต้นเร้าใจสู่ Chapter 2!'
    }
  }
};
