// Bilingual release defaults revised against the notification-copy review.
export const RELEASE_TEMPLATES={
  "uat": {
    "zh": "◀️ OMNIPLAY 測試環境 - 新遊戲上架預告 ▶️\n\n✔️ 遊戲已上架至測試環境，可供測試使用。\n\n※ 遊戲正式上架至 PROD 環境後，我們將另行發送通知。請於收到正式上架通知後，再安排相關操作。",
    "en": "◀️OMNIPLAY UAT Environment－New Game Preview ▶️ \n\n✔️ The game is now available in the UAT environment for testing.\n\n※ A separate notification will be sent once the game is released to the PROD environment. Please wait for this notification before proceeding with the relevant operations."
  },
  "pord": {
    "zh": "◀️ OMNIPLAY 正式環境 - 新遊戲上架通知 ▶️\n\n✔️ 遊戲已上架至正式環境，請貴平台協助安排遊戲上架。\n\n如有任何問題或回饋，歡迎隨時與我們聯繫，謝謝。",
    "en": "◀️OMNIPLAY PROD Environment - New Game Release ▶️\n\n✔️ The game is now available in the PROD environment. Please arrange to launch it on your platform.\n\nIf you have any questions or feedback, please feel free to contact us. Thank you."
  },
  "first-uat": {
    "zh": "◀️ OMNIPLAY 測試環境 - 遊戲搶先體驗預告 ▶️\n\n✔️ 遊戲已上架至測試環境，可供測試使用。\n⭐ 貴平台搶先體驗期間：（UTC+8）至（UTC+8）\n※ 遊戲正式上架至 PROD 環境後，將另行發送通知。請於收到通知後再安排相關操作。",
    "en": "◀️ OMNIPLAY UAT Environment – Game Early Access Preview ▶️\n\n✔️ The game is now available in the UAT environment for testing.\n⭐ Early Access Period on Your Platform: (UTC+8) to (UTC+8)\n※ A separate notification will be sent once the game is released to the PROD environment. Please wait for this notification before proceeding with the relevant operations."
  },
  "first-pord": {
    "zh": "◀️ OMNIPLAY 正式環境－遊戲搶先體驗上架通知 ▶️\n\n⭐ 搶先體驗期間：即日起至（UTC+8）。\n✔️ 遊戲已上架至正式環境，請貴平台協助安排遊戲上架。\n※ 如搶先體驗期間有延長，將另行通知。",
    "en": "◀️ OMNIPLAY PROD Environment – Game Early Access Release ▶️\n\n⭐ Early Access Period: From now until (UTC+8).\n✔️ The game is now available in the PROD environment. Please arrange to launch it on your platform.\n※ We will notify you separately if the early access period is extended."
  },
  "first-pord-extension": {
    "zh": "◀️ OMNIPLAY 正式環境 - 遊戲搶先體驗延長通知 ▶️\n\n⭐ 搶先體驗期間延長【請輸入延長天數】天，調整後截止時間為（UTC+8）。\n✔️ 請貴平台於延長期間持續開放本遊戲供玩家體驗。",
    "en": "◀️ OMNIPLAY PROD Environment - Game Early Access Extension Notice ▶️\n\n⭐ The early access period has been extended by [Enter extension days] days. The new end time is (UTC+8).\n✔️ Please keep the game available to players on your platform throughout the extended period."
  },
  "materials": {
    "zh": "◀️ OMNIPLAY - 新遊戲行銷素材補充通知 ▶️\n\n以下補充提供先前公告遊戲的相關行銷素材，敬請查收！\n\n遊戲 ID：\n遊戲名稱：\n遊戲素材：\n行銷資源：\n\n✔️ 本次補充提供遊戲相關素材，供貴司後續推廣使用。\n\n※ 本通知僅為素材補充，不影響原訂遊戲上線時程。\n\nOMNIPLAY 團隊 敬上",
    "en": "◀️ OMNIPLAY  - New Game Marketing Materials Update ▶️\n\nWe are providing additional marketing materials for the previously announced game. Please find the details below.\n\nGame ID:\nGame Name:\nGame Assets:\nMarketing Resources:\n\n✔️ These additional materials are provided for your future promotional use.\n\n※ This notice is for supplementary materials only and does not affect the originally scheduled game launch date.\n\nBest regards,\nOMNIPLAY Team"
  },
  "schedule-change": {
    "zh": "◀️【新遊戲上線時間調整通知】▶️\n\n原定於（UTC+8）上線的以下遊戲，因仍需進行最後階段的優化與調整，將延後上線。新上線時間確認後，我們將另行通知。",
    "en": "◀️ 【Notice of New Game Launch Postponement】 ▶️\n\nThe following game, originally scheduled for release on (UTC+8), has been postponed to allow additional optimization and adjustments. We will notify you once the revised release schedule is confirmed."
  },
  "uat-no-dm": {
    "zh": "◀️ OMNIPLAY 測試環境 - 新遊戲上架預告 ▶️\n\n✔️ 遊戲已上架至測試環境，可供測試使用。\n🗂 遊戲資料預計提供時間：（UTC+8）\n📅 預計正式上架時間：（UTC+8）",
    "en": "◀️ OMNIPLAY UAT Environment－New Game Preview  ▶️\n\n✔️ The game is now available in the UAT environment for testing.\n🗂 Expected Game Materials Availability: (UTC+8)\n📅 Expected PROD Release Time: (UTC+8)"
  },
  "schedule-updated": {
    "zh": "◀️【新遊戲上線時間更新通知】▶️\n\n先前延期上線的以下遊戲，現已確認新的預定上線時間為（UTC+8）。實際上線狀態仍以後續正式通知為準。",
    "en": "◀️ Notice of Revised Game Release Schedule ▶️\n\nThe revised release schedule for the following postponed game has been confirmed. The new scheduled release time is (UTC+8). Please refer to the subsequent official release notification for confirmation that the game is live."
  }
};

const TEMPLATE_KEYS={'flow-uat':'uat','other-uat':'uat','selected-uat':'uat','flow-pord':'pord','other-pord':'pord','selected-pord':'pord','first-pord':'first-pord','first-pord-extension':'first-pord-extension','materials':'materials','schedule-change':'schedule-change'};
export function releaseTemplate(typeId,game,variant='standard'){
 let key=TEMPLATE_KEYS[typeId];if(key==='uat'&&variant==='no-dm')key='uat-no-dm';if(typeId==='schedule-change'&&variant==='rescheduled')key='schedule-updated';
 const template=RELEASE_TEMPLATES[key];if(!template)return null;
 const title=text=>text.split('\n')[0].trim();
 const description=text=>text.split('\n').slice(1).filter(line=>{
  const value=line.trim();
  return !/^(遊戲 ID|遊戲名稱|遊戲清單|遊戲素材|行銷資源|Game ID|Game Name|Game List|Game Assets|Marketing Resources)\s*[：:]/i.test(value)
   && !/^(看看即將|快來看看即將|Check out the upcoming)/i.test(value)
   && (key==='first-pord'||!/^(OMNIPLAY 團隊 敬上|OMNIPLAY Team|Best regards,)$/.test(value))
   && !/^[📅🗓🗓️\s]*(正式環境(?:預計)?上線日期|正式環境上線日期|PROD Environment Release Date|Expected Production Launch Date)\s*[：:]/i.test(value);
 }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
 const dates=(text,lang)=>text.replace(/(?:（UTC\+8）|\(UTC\+8\))/g,()=>'〔UTC+8 YYYY/MM/DD HH:mm〕');
 return {titleZh:title(template.zh),titleEn:title(template.en),messageZh:dates(description(template.zh)+(key==='materials'?'\n\n🗂 素材補充時間：（UTC+8）':''),'zh'),messageEn:dates(description(template.en)+(key==='materials'?'\n\n🗂 Materials Update Time: (UTC+8)':''),'en'),supportsNoDm:TEMPLATE_KEYS[typeId]==='uat',note:''};
}



export function releaseTemplateVariants(typeId){
 if(TEMPLATE_KEYS[typeId]==='uat')return [{id:'standard',zh:'標準版本',en:'Standard'},{id:'no-dm',zh:'無 DM 版本',en:'Without DM'}];
 if(typeId==='schedule-change')return [{id:'standard',zh:'上線延期通知',en:'Release Postponement'},{id:'rescheduled',zh:'延期後上線時間更新',en:'Revised Release Schedule'}];
 return [];
}
