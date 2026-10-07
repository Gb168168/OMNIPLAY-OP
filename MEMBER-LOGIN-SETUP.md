# 恢復群組人員登入

## 一次性啟用

1. 將本次網站修改發布到 GitHub Pages。
2. 首次啟用時使用原 Firebase 管理員電子郵件登入 OMNIPLAY-OP，在群組的人員管理新增或確認 Cia_Cia 帳號及其人員密碼。等候上方顯示「已同步」；原有人員會同步到 Firebase Authentication，管理員無需重建人員。
3. Firebase → Firestore → 規則，將整份 `firestore.rules` 貼上並發布。
4. 使用原本人員帳號（例如 F）與在人員管理設定的密碼登入，確認只能查看群組開放頁面。

之後新增／修改人員和群組權限，仍在網站原本的管理畫面操作。同步成功後，人員可以使用相同帳密登入。無需開通 Cloud Functions、升級付費方案或自行在 Firebase 建立人員。

## 保留與權限

- Cia_Cia、K、F 全部使用人員管理設定的帳密登入。同步時只有 Cia_Cia 的伺服器權限資料會標記為最高管理者；K、F 保留群組人員權限。角色資料僅由管理員寫入，不能修改瀏覽器狀態取得最高權限。
- 原 Firebase 管理員電子郵件登入保留作為首次同步及復原入口，不是 Cia_Cia 的日常登入方式。發布新規則且同步 Cia_Cia 後，即可改用 Cia_Cia 人員帳密管理整個工作區。
- 群組人員、客戶原有帳號與密碼保留。登入帳號大小寫不敏感。
- Firebase 使用獨立的登入識別信箱及橋接密碼，人員只需輸入原本帳號、密碼；Firebase 清單中的橋接帳號不作為工作區角色設定。
- 人員僅讀取群組開放的頁面與相關資料，不可讀取管理員的完整工作區、其他人員密碼或橋接憑證。
- 刪除人員會撤銷該人員的資料存取；舊 Firebase 使用者可能仍留在 Authentication 清單，但沒有工作區權限。
- 修改帳密由獨立、不保存登入狀態的 Firebase app 處理，不會把管理員登出。
- 若上方顯示「人員登入同步失敗」，該人員尚未完成同步。先確認 Email/Password 登入方式已啟用，並依錯誤訊息排除。
- 管理員目前仍可在原有介面查看及修改人員密碼；該管理資料只開放管理員讀取。沒有將原含帳密工作區開放給所有人。

## 驗證

- `node --test tests/member-model.test.mjs`
- `npm install` 後執行 `npm run test:firebase`（Firebase CLI 15 需要 Java 21）。測試只使用 `demo-omniplay-members` 的本機 Auth／Firestore emulator。
- 規則測試涵蓋管理員操作、人員範圍、跨群組阻擋、修改權限阻擋、稽核身分及撤銷權限。登入同步測試涵蓋原有人員、改密碼、改帳號、刪除、重新新增及管理員登入保留。

Firebase 規則必須在 Console 或受權的 Firebase CLI 發布；修改 GitHub 中的 `.rules` 檔案不會自動改變 Firebase 已發布規則。
