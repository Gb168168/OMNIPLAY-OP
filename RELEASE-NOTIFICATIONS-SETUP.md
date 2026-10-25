# 上架通知獨立集合

上架通知管理的主資料改存 `omniplay-release-notifications/{通知 ID}`。每則通知一份文件，管理端依 `createdAt` 由新至舊讀取最近 100 則。群組接收副本仍位於 `omniplay-group-views/{群組 ID}.releaseNotifications`，客戶無法直接讀取主集合。

## 正式啟用順序

1. 在 Firebase 主控台發布此版本完整的 `firestore.rules`。規則開放內部管理者讀寫新集合，並禁止繼續寫入舊通知文件，避免舊分頁在移轉後新增遺漏通知。
2. 部署新網站程式，重新整理管理端。管理端載入通知時，會把 `omniplay/game-release-notifications.items` 逐筆移轉到新集合，再訂閱通知；發布或撤回前也會核對移轉。
3. 在 Firestore 核對新集合的通知 ID、內容及狀態，並確認管理端能發布、撤回，接收群組顯示正常。

移轉保留原 ID、發布時間、接收群組與撤回狀態。每筆交易只建立不存在的文件，可重跑或在失敗後重試，不覆蓋已撤回的新文件，也不重發群組副本。舊文件保留作備份，不需手動刪除。不要只刪除新集合文件作為清理方式，保留的舊備份會於下次移轉重新建立該 ID；請使用通知管理的撤回功能。

程式更新與 PR 不會自動發布 Firebase 規則，也不代表正式資料已完成移轉。

## 驗證

`node --test tests/release-notifications.test.mjs`：通知發布、群組隔離、撤回、舊資料移轉與重試。

`npm run test:firebase`：包含新集合的內部／客戶／未登入權限與舊文件禁止寫入檢查，需要 Firebase CLI、專案開發依賴與 Java 21。
