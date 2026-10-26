/* Translate interface labels only; never rewrite form values or saved records. */
(() => {
 'use strict';
 if(window.omniplayUI)return;
 const pairs = String.raw`
操作手冊|User Manual
平台可見|Visible to Platforms
關閉時僅管理端可見；開啟後依群組權限顯示。|Off: management only. On: shown according to group permissions.
此分類僅管理端可見；請先在分類的 ⋯ 開啟平台可見。|This category is internal. Enable Visible to Platforms in its ⋯ menu first.
頁面操作|Page Actions
Game List_Online 連動資料|Game List_Online Linked Data
收合 ▴|Collapse ▴
展開 ▾|Expand ▾
⚙ 欄位設定|⚙ Field Settings
此資料夾目前沒有內容|This folder is empty
關閉|Close
取消|Cancel
儲存|Save
編輯|Edit
刪除|Delete
移除|Remove
查看|View
下載|Download
操作|Actions
功能鍵|Actions
重新整理|Refresh
重新載入|Reload
重試|Retry
改名|Rename
重新命名|Rename
全選|Select All
全選／取消全選|Select / Deselect All
未設定|Not Set
未命名|Untitled
未命名遊戲|Unnamed Game
未設定版本|Version Not Set
未分類|Uncategorized
未填域名|No Domain
載入中…|Loading…
已載入|Loaded
儲存中…|Saving…
刪除中…|Deleting…
上傳中…|Uploading…
已儲存|Saved
儲存失敗|Save Failed
未知錯誤|Unknown Error
連線異常|Connection Error
圖片處理中…|Processing images…
圖片處理中，請稍候|Images are processing. Please wait.
登出|Log Out
登入|Log In
操作紀錄|Activity Log
帳號與管理設定|Account & Administration
切換英文|Switch to English
所有平台列表|All Platforms
內部參考|Internal Reference
內部參考，請勿外流|Internal Reference — Do Not Distribute
平台視角|Platform View
👁 平台視角|👁 Platform View
平台資源|Platform Resources
工作區|Workspace
OMNIPLAY / 客戶參考文件|OMNIPLAY / Customer Resources
平台視角 / 群組預覽（唯讀）|Platform View / Group Preview (Read Only)
平台視角 / 管理模式|Platform View / Management
客戶群組預覽（唯讀）|Customer Group Preview (Read Only)
管理模式（可編輯）|Management (Editable)
群組共同可見內容|Shared Group Content
客戶群組畫面預覽|Customer Group Preview
個別平台畫面預覽|Platform Preview
遊戲清單|Game List
遊戲素材|Game Assets
認證報告|Certification Reports
RNG報告|RNG Reports
RTP報告|RTP Reports
遊戲說明|Game Description
行銷資源|Marketing Resources
遊戲資訊|Game Information
遊戲資料|Game Information
遊戲資料管理|Game Information Management
遊戲總數|Total Games
準備中|Preparing
已發行|Released
敬請期待|Coming Soon
已發行／特選遊戲|Released / Special Release
敬請期待／特選遊戲|Coming Soon / Special Release
其他狀態|Other Statuses
已上線 Released|Released
即將上線 Coming Soon|Coming Soon
已發行 Released|Released
即將發行 Coming Soon|Coming Soon
已上線 Released / 獨家遊戲 Exclusive|Released / Exclusive
已發行 Released / 特選遊戲 Special Release|Released / Special Release
獨家遊戲 Exclusive|Exclusive
特選遊戲 Special Release|Special Release
特選遊戲|Special Release
已上線|Released
已取得|Yes
未取得|No
支援|Supported
不支援|Not Supported
欄位名稱與順序依照 OP GAME.xlsx；向右捲動可查看全部資料。|Columns follow OP GAME.xlsx. Scroll right to view all fields.
僅顯示已開放給所屬群組的遊戲資料。|Only games available to your group are shown.
搜尋 GAME ID、名稱、版本…|Search Game ID, name, or version…
搜尋 GAME ID、遊戲名稱、版本…|Search Game ID, name, or version…
下載目前搜尋／狀態篩選結果|Download the current search and status filter results
⬇ 下載 Excel|⬇ Download Excel
中文遊戲名稱|Game Name (Mandarin)
英文遊戲名稱|Game Name (English)
遊戲名稱（中文）|Game Name (Chinese)
遊戲名稱（英文）|Game Name (English)
遊戲ID|Game ID
狀態|Status
上線日期|Release Date
Pagcor 驗證|Pagcor Approval
是否取得 Pagcor 驗證|Pagcor Approval
是否支援|Supported
可查看群組|Allowed Groups
對應檔案／圖片|Linked Files / Images
對應這個 GAME ID 的檔案／圖片（可多選）|Files / Images Linked to This Game ID (Multiple Selections)
允許查看的所屬群組（可多選）|Groups with Access (Multiple Selections)
備註|Notes
備註說明|Notes
輸入這個遊戲的補充說明|Enter additional information about this game
儲存遊戲資料|Save Game Information
刪除遊戲|Delete Game
管理選項|Manage Options
尚無選項|No options yet
＋ 新增選項…|＋ Add Option…
新的選項名稱：|New option name:
新增選項名稱：|New option name:
已有相同名稱的選項|An option with this name already exists
改名會更新所有使用此選項的遊戲；刪除後，使用此選項的遊戲會改為「未設定」。|Renaming updates all games using this option. Deleting resets those games to Not Set.
請先在檔案或圖片頁面加入資料|Add files or images on a resource page first
請先建立所屬群組|Create a group first
找不到遊戲資料|Game information not found
遊戲資料載入失敗|Unable to load game information
遊戲資料尚未就緒，請重新整理|Game information is not ready. Please refresh.
沒有編輯權限|You do not have editing permission
來源表找不到此遊戲，請重新載入|The game was not found in the source sheet. Please reload.
這是舊版留下的檔名紀錄，沒有檔案內容，請重新上傳。|This legacy entry contains only a filename. Please upload the file again.
這是舊版留下的檔名紀錄，請重新上傳。|This is a legacy filename entry. Please upload the file again.
舊資料，需重新上傳|Legacy entry. Please upload again.
此檔案只有名稱，需重新上傳|Only the filename is available. Please upload again.
檔案上傳失敗，請確認 Firebase Storage 權限或稍後再試。|Upload failed. Check Firebase Storage permissions or try again later.
＋ 新增檔案資料夾|＋ New File Folder
＋ 新增圖片資料夾|＋ New Image Folder
＋ 新增資料夾|＋ New Folder
⬆ 上傳檔案／圖片|⬆ Upload Files / Images
刪除目前資料夾|Delete Current Folder
新增圖片資料夾名稱：|New image folder name:
新增檔案資料夾名稱：|New file folder name:
資料夾名稱：|Folder name:
新名稱：|New name:
點這裡後按 Ctrl + V 貼上圖片到目前資料夾|Click here, then press Ctrl + V to paste images into this folder
剪貼簿裡沒有可貼上的圖片|No images are available to paste from the clipboard
圖片|Images
檔案|File
顯示方式|Display Mode
資料夾操作|Folder Actions
☰ 列表|☰ List
▦ 縮圖|▦ Thumbnails
通知|Notifications
🔔 通知|🔔 Notifications
通知管理|Notification Management
🔔 通知管理|🔔 Notification Management
上架通知管理|Release Notification Management
＋ 新增上架通知|＋ New Release Notification
新增上架通知|New Release Notification
編輯上架通知|Edit Release Notification
通知內容|Notification Content
通知類型|Notification Type
通知圖片|Notification Images
通知預覽|Notification Preview
通知標題（中）|Notification Title (Chinese)
通知標題（英）|Notification Title (English)
通知說明（中）|Description (Chinese)
通知說明（英）|Description (English)
說明日期（UTC+8）|Description Date (UTC+8)
上架時間（UTC+8）|Release Time (UTC+8)
PORD 上架時間（UTC+8）|PORD Release Time (UTC+8)
【請輸入 YYYY / MM / DD】|[Enter YYYY / MM / DD]
選擇遊戲|Select Game
遊戲|Game
接收群組|Recipient Groups
預覽通知|Preview Notification
儲存修改並同步群組|Save & Sync Groups
確認發布通知|Publish Notification
確認後立即同步所選接收群組|Sync selected groups immediately after confirmation
已撤回|Withdrawn
撤回|Withdraw
撤回通知|Withdraw Notification
編輯通知|Edit Notification
發布時間|Published
標為已讀|Mark as Read
全部標為已讀|Mark All as Read
目前沒有通知|No notifications yet
流程|Workflow
首發|Early Access
特選|Special Release
其他|Other
上架 UAT|Release UAT
上架 PORD|Release PORD
首發平台 PORD|Early Access Platform PORD
首發平台 PORD 延長|Early Access Platform PORD Extension
其他平台(首發後) UAT|Other Platforms (After Early Access) UAT
其他平台(首發後) PORD|Other Platforms (After Early Access) PORD
其他平台(首發後)UAT|Other Platforms (After Early Access) UAT
特選遊戲 UAT|Special Release UAT
特選遊戲 PORD|Special Release PORD
素材補充通知|Additional Materials Notice
新遊戲上線時間調整通知|Game Release Schedule Update
轉PORD|Convert to PORD
測試環境上架|UAT Release
正式環境上架|PROD Release
通知已撤回或不存在|The notification was withdrawn or no longer exists
通知已撤回或不存在，請重新開啟|The notification was withdrawn or no longer exists. Please reopen it.
通知已被其他管理員修改，請重新開啟後再編輯|Another administrator updated this notification. Reopen it before editing.
刪除這則通知？管理列表與接收端會一起移除。|Delete this notification from both management and recipient lists?
撤回這則通知？接收端會移除，管理列表保留紀錄。|Withdraw this notification? It will be removed for recipients and retained in management history.
撤回這則通知？接收群組的通知列表會移除此則通知。|Withdraw this notification from recipient groups?
舊通知識別碼無效，請聯絡管理者|The legacy notification ID is invalid. Contact an administrator.
部分群組尚未同步或已停用，請先完成群組同步後重試|Some groups are unsynced or disabled. Sync them and try again.
一次調整的接收群組過多，請分次調整|Too many recipient groups. Update them in smaller batches.
部分接收群組尚未同步或已停用|Some recipient groups are unsynced or disabled
圖片載入失敗，請重新開啟通知重試|Unable to load images. Reopen the notification to try again.
載入遊戲與接收群組…|Loading games and recipient groups…
舊通知類型|Legacy Notification Type
尚無遊戲資料，請先建立 Game List|No games are available. Create a Game List first.
尚無接收群組，請先建立群組|No recipient groups are available. Create a group first.
選擇遊戲後，自動帶入可查看該遊戲的接收群組，再編寫通知內容。|Select a game to load its recipient groups, then write the notification.
選擇遊戲後，自動勾選該遊戲所屬群組，可再手動調整。|Selecting a game automatically selects its groups. You can adjust them manually.
此遊戲尚未設定所屬群組，請手動選擇接收群組。|This game has no assigned groups. Select recipient groups manually.
已帶入原通知的接收群組；儲存後會同步更新新增、保留與移除的群組。|Original recipient groups loaded. Saving synchronizes added, retained, and removed groups.
通知不會變更遊戲上架狀態或群組查看權限。發布後立即送出；上架時間不是排程時間。|Notifications do not change game status or group access. They are sent immediately; the release time is not a send schedule.
填寫左側內容、確認接收群組後，按「預覽通知」查看發布內容。|Complete the content, confirm recipient groups, then select Preview Notification.
管理類型（新增／刪除）|Manage Types (Add / Delete)
類型清單會同步給所有管理員；刪除類型不影響已發布的通知。|Types are shared with all administrators. Deleting a type does not affect published notifications.
分類|Category
類型名稱|Type Name
英文名稱（選填）|English Name (Optional)
＋ 新增類型|＋ Add Type
請先新增通知類型|Add a notification type first
請輸入通知類型名稱|Enter a notification type name
依通知類型自動帶入，可自行修改|Auto-filled by notification type; editable
例如：Maintenance UAT|Example: Maintenance UAT
例如：遊戲已於測試環境上架，請安排驗收。|Example: The game is available in UAT. Please arrange acceptance testing.
UAT 模板版本|UAT Template Version
標準版本|Standard Version
無 DM 版本|Version Without DM
重新套用模板|Reapply Template
已依通知類型帶入中英文模板，內容可再編輯。|Chinese and English templates loaded. You can edit the content.
此類型尚無預設模板，可自行填寫內容。|No default template is available for this type. Enter the content manually.
重新套用會取代目前已修改的中英文標題與說明，是否繼續？|Reapplying replaces your edited Chinese and English titles and descriptions. Continue?
預設採實際發行日期，空白才用預計日期；可手動修改，並同步中英文。|Defaults to the actual release date, or the planned date if blank. Changes apply to both languages.
＋ 選擇圖片|＋ Choose Images
貼上通知圖片|Paste Notification Images
在這裡貼上圖片|Paste Images Here
點一下此區域，再按|Click this area, then press
（Mac：⌘V）|(Mac: ⌘V)
最多 3 張 JPG、PNG 或 WebP，單張上限 10 MB；圖片會自動縮圖。|Up to 3 JPG, PNG, or WebP images, 10 MB each. Images are resized automatically.
原圖片暫時無法預覽，儲存時仍會保留。|The original image cannot be previewed now. It will be retained when saving.
移除圖片|Remove Image
每則通知最多 3 張圖片|Up to 3 images per notification
正在處理圖片…|Processing images…
圖片處理失敗|Image processing failed
請選擇 JPG、PNG 或 WebP 圖片|Choose a JPG, PNG, or WebP image
單張圖片上限 10 MB|Each image must be 10 MB or smaller
無法讀取圖片|Unable to read image
圖片壓縮後仍過大，請縮小圖片後重試|The compressed image is still too large. Resize it and try again.
通知圖片資料無效|Invalid notification image data
圖片無法載入|Unable to load image
沒有符合條件的遊戲，請調整搜尋文字。|No matching games. Adjust your search.
請輸入完整遊戲名稱、Game ID，或從下拉結果選擇遊戲|Enter a full game name or Game ID, or select a game from the results
此遊戲已不存在，無法帶入新通知|This game no longer exists and cannot be used for a new notification
請輸入或選擇有效的遊戲|Enter or select a valid game
請選擇有效日期|Select a valid date
請選擇遊戲並確認登入狀態|Select a game and confirm you are logged in
請選擇有效的通知類型|Select a valid notification type
標題必填且限 200 字；中英文說明各限 2000 字|Titles are required (up to 200 characters). Descriptions allow 2,000 characters per language.
請填寫有效的上架時間|Enter a valid release time
請選擇有效的接收群組（最多 400 個）|Select valid recipient groups (up to 400)
通知圖片資料無效，每則最多 3 張|Invalid image data. Up to 3 images per notification.
通知類型最多 100 個|Up to 100 notification types
通知類型資料無效|Invalid notification type data
此通知類型已存在|This notification type already exists
上架日期以 UTC+8 顯示。已讀狀態保留於此瀏覽器。|Release dates use UTC+8. Read status is saved in this browser.
請先在所有平台列表建立平台。|Create a platform in All Platforms first.
搜尋平台|Search Platforms
搜尋平台名稱或域名|Search platform name or domain
＋ 新增 Pagcor Approval|＋ Add Pagcor Approval
上傳圖片／檔案|Upload Images / Files
圖片 檔案與連結|Images, Files & Links
允許查看的平台|Platforms with Access
加入連結|Add Link
開啟連結|Open Link
連結名稱|Link Name
連結網址|Link URL
連結名稱，例如：CPS1|Link name, e.g. CPS1
完整網址，例如：https://example.com/report|Full URL, e.g. https://example.com/report
儲存 Pagcor Approval|Save Pagcor Approval
尚無 Pagcor Approval 資料|No Pagcor Approval items yet
僅勾選的平台帳號可查看。未勾選任何平台時，只有內部管理者可看。同群組平台不會自動共用此權限。|Only selected platform accounts can view these items. With no platforms selected, only internal administrators have access. Access is not shared automatically within a group.
單檔上限 20 MB，每款遊戲最多 50 個項目。儲存後才套用。填完連結可直接按下方儲存。|Up to 20 MB per file and 50 items per game. Changes apply after saving. Enter a link and select Save below.
此群組的平台權限不同，請在上方選擇個別平台預覽。|Platforms in this group have different permissions. Select an individual platform above to preview.
平台權限尚未同步，請先執行「同步帳號與權限」後再預覽。|Platform permissions are not synced. Run Sync Accounts & Permissions before previewing.
移除這個項目？儲存後生效。|Remove this item? The change applies after saving.
每款遊戲最多 50 個項目|Up to 50 items per game
請選擇 20 MB 以內的非空白檔案|Choose a nonempty file of 20 MB or smaller
已上傳，請儲存以套用|Uploaded. Save to apply.
請輸入連結名稱|Enter a link name
請貼上完整連結網址（https://…）|Paste the full link URL (https://…)
連結網址無效，請貼上完整的 http:// 或 https:// 網址|Invalid URL. Paste a full http:// or https:// URL.
請儲存以套用|Save to apply
請輸入連結名稱與完整網址|Enter a link name and full URL
其他人已修改此遊戲的 Pagcor Approval，請關閉後重新開啟|Another person updated this game's Pagcor Approval. Close and reopen it.
所屬群組|Group
所屬平台|Platform
客戶群組|Customer Groups
客戶群組預覽（唯讀）|Customer Group Preview (Read Only)
人員名稱|Member Name
人員管理|Members
帳號|Account
群組|Group
登入帳號|Username
登入密碼|Password
管理員|Administrator
最高管理者|Owner
一般使用者|User
管理員權限|Administrator Permissions
系統管理|Administration
權限設定|Permissions
設定權限|Set Permissions
沿用群組權限|Use Group Permissions
儲存群組權限|Save Group Permissions
⚙ 設定群組權限|⚙ Group Permissions
管理平台、群組、人員與權限|Manage platforms, groups, members, and permissions
集中查看所有平台資料，並可直接調整分類、進度與所屬群組。|View all platforms and update their categories, progress, and groups.
管理此群組的人員與登入帳密。|Manage this group's members and login credentials.
尚未新增內部人員|No internal members yet
請使用上方欄位建立第一個帳號|Use the fields above to create the first account
輸入姓名|Enter name
輸入登入帳號|Enter username
輸入登入密碼|Enter password
＋ 新增人員|＋ Add Member
此登入帳號已被其他人員使用|This username is already used by another member
最高管理者帳號必須保留 Rondo|The owner account must remain Rondo
群組分類管理|Group Categories
尚無群組分類|No group categories yet
按下方按鈕新增第一個群組|Use the button below to add the first group
系統管理 / 群組分類|Administration / Group Categories
新增群組分類名稱：|New group category name:
編輯群組名稱：|Edit group name:
已有相同名稱的群組|A group with this name already exists
請先將此群組的平台移到其他群組|Move this group's platforms to another group first
只有最高管理者可以新增群組|Only the owner can add groups
此帳號沒有「所有平台列表」權限|This account cannot access All Platforms
請先選擇所屬群組|Select a group first
← 返回群組列表|← Back to Groups
群組客戶|Group Customers
這個群組還沒有客戶|This group has no customers yet
尚未建立平台|No platforms yet
一般平台|Standard Platform
IR平台|IR Platform
一般客戶|Standard Customer
客戶名稱|Customer Name
客戶域名|Customer Domain
通訊 APP|Messaging App
對接進度|Integration Progress
尚未開始|Not Started
測試環境對接中|UAT Integration in Progress
正式環境對接中|PROD Integration in Progress
正式上線|Live
已暫停|Paused
已終止|Terminated
未指定平台|No Platform Assigned
編輯平台|Edit Platform
建立平台|Create Platform
儲存變更|Save Changes
取消編輯|Cancel Editing
刪除客戶|Delete Customer
＋ 新增客戶|＋ Add Customer
＋ 新增平台|＋ Add Platform
按右上「新增平台」開始|Select Add Platform above to start
按右上「新增客戶」建立第一位客戶|Select Add Customer above to create the first customer
Pagcor Approval 依此平台授權；未指定則無法查看受限資料。|Pagcor Approval access is assigned by platform. Restricted items are unavailable without an assigned platform.
依照「分類 → 頁面」顯示，勾選要開放給此群組查看的頁面。|Select the pages this group can view, organized by category and page.
目前沒有可設定的頁面|No pages available to configure
正在同步客戶權限…|Syncing customer permissions…
☁️ 群組權限已同步到客戶端|☁️ Group permissions synced to customers
已核對雲端客戶資料，群組權限同步完成|Cloud customer data verified. Group permissions are synced.
重試儲存群組權限|Retry Saving Group Permissions
此群組尚未同步|This group has not been synced
此群組權限已停用|This group's access is disabled
請聯絡管理員。|Contact an administrator.
這個群組沒有此頁面的查看權限。|This group cannot view this page.
請選擇上方的資源類型開始管理。|Select a resource type above to start managing it.
建立此頁面|Create This Page
此群組尚未開放|Not Available to This Group
請先建立內部 OP GAME 遊戲資料頁面|Create the internal OP GAME page first
分類操作|Category Actions
重新命名頁面|Rename Page
刪除頁面|Delete Page
重新命名分類|Rename Category
刪除分類|Delete Category
頁面|Page
＋ 新增分類…|＋ Add Category…
歡迎使用 OMNIPLAY|Welcome to OMNIPLAY
目前沒有分類|No categories yet
按「新增分類」開始建立工作區。|Select Add Category to start building your workspace.
這個分類還沒有頁面|This category has no pages yet
按右上角「新增頁面」開始。|Select Add Page above to start.
正在讀取此頁面的試算表資料…|Loading this page's spreadsheet data…
正在載入試算表功能…|Loading spreadsheet tools…
工作區載入失敗|Unable to load workspace
雲端工作區讀取逾時|Cloud workspace request timed out
雲端連線異常|Cloud Connection Error
☁️ 客戶資料已載入|☁️ Customer data loaded
☁️ Firestore 雲端資料|☁️ Firestore Cloud Data
☁️ 儲存中…|☁️ Saving…
☁️ 已同步|☁️ Synced
☁️ 試算表儲存中…|☁️ Saving spreadsheet…
目前登入者|Active Sessions
每 2 分鐘回報；列出最近 5 分鐘仍有回報的連線|Updates every 2 minutes. Shows connections active within the last 5 minutes.
連線數|Connections
最後回報|Last Active
目前沒有登入中的連線|No active sessions
強制登出|Force Log Out
管理者已將此帳號強制登出|An administrator has logged this account out
目前登入者功能尚未啟用，請先發布新版 Firestore 規則。|Active sessions are not enabled. Publish the updated Firestore rules first.
無法讀取目前登入者，請確認新版 Firestore 規則已發布。|Unable to load active sessions. Check that the updated Firestore rules are published.
紀錄類型|Log Type
登入／登出|Login / Logout
登入/登出|Login / Logout
操作（下載／強制登出）|Actions (Download / Force Logout)
人員|Member
登入時間|Login Time
登出時間|Logout Time
時間|Time
操作人員|Member
動作|Action
項目／對象|Item / Target
未取得登入紀錄|No login record available
沒有符合條件的紀錄|No matching records
紀錄載入失敗|Unable to load activity log
登入工作區|Log In to Workspace
請輸入帳號與密碼|Enter your username and password
請輸入登入帳號|Enter username
請輸入密碼|Enter password
顯示密碼|Show Password
顯示|Show
隱藏|Hide
記住我的登入|Remember Me
驗證中…|Verifying…
請使用人員管理中設定的帳號與密碼|Use the credentials configured in Members
帳號或密碼錯誤|Incorrect username or password
登入嘗試過多，請稍後再試|Too many login attempts. Try again later.
此帳號的群組權限尚未啟用，請聯絡管理員|This account's group access is not enabled. Contact an administrator.
此帳號沒有工作區權限；若已完成交接，請使用 Rondo 登入|This account has no workspace access. If ownership was transferred, log in as Rondo.
請先發布新版 Firebase 規則，才能啟用人員登入|Publish the updated Firebase rules to enable member login
無法讀取人員權限，請稍後再試|Unable to load member permissions. Try again later.
建立 Rondo 並交接|Create Rondo & Transfer Ownership
同步帳號與權限|Sync Accounts & Permissions
☁️ 正在同步帳號與權限…|☁️ Syncing accounts and permissions…
☁️ 帳號與權限已同步|☁️ Accounts and permissions synced
設定最高管理者 Rondo|Set Up Owner Rondo
關閉管理員權限|Close Administrator Permissions
Rondo 登入密碼|Rondo Password
正在建立、驗證並交接 Rondo…|Creating and verifying Rondo, then transferring ownership…
只有 Rondo 能指定或取消管理員。其他管理員可以編輯網站、查看登入紀錄，但不能任免管理員或讀取人員密碼。|Only Rondo can appoint or remove administrators. Other administrators can edit the site and view login logs, but cannot manage administrator roles or read passwords.
先發布新版 Firebase 規則。交接後，請用 Rondo 和下方設定的密碼登入；原信箱不再具有網站管理權限。|Publish the updated Firebase rules first. After transfer, log in as Rondo with the password below. The original email loses administrator access.
正在載入人員…|Loading members…
目前沒有啟用的人員。|No active members.
未指定群組|No Group Assigned
最高管理者交接|Transfer Ownership
權限變更於下次登入生效|Permission changes take effect on the next login
預設值|Default Value
—（此群組未開放）|— (Unavailable to This Group)
未開放|Unavailable
已修改，請儲存以套用|Modified. Save to apply.
已移除這組數值，原群組恢復預設值。請儲存以套用。|This value set was removed and its groups now use the default. Save to apply.
每個欄位最多 20 組額外數值|Up to 20 additional value sets per field
儲存與同步群組資料中…|Saving and syncing group data…
遊戲資料不存在，請關閉後重新載入|Game information no longer exists. Close and reload.
其他人已修改此遊戲的欄位設定，請關閉後重新開啟|Another person updated this game's field settings. Close and reopen.
已儲存，群組資料已同步|Saved. Group data synced.
儲存欄位與群組設定|Save Fields & Group Settings
重試群組同步|Retry Group Sync
試算表功能選單|Spreadsheet Menu
請先選取儲存格|Select cells first
編輯|Edit
復原|Undo
重做|Redo
檢視|View
插入|Insert
格式|Format
資料|Data
說明|Help
下載 CSV|Download CSV
顯示／隱藏格線|Show / Hide Gridlines
凍結首列|Freeze First Row
凍結前兩列|Freeze First Two Rows
取消凍結|Unfreeze
在上方插入列|Insert Row Above
在下方插入列|Insert Row Below
在左方插入欄|Insert Column Left
在右方插入欄|Insert Column Right
插入備註|Insert Note
刪除備註|Delete Note
顯示／隱藏備註|Show / Hide Note
文字靠左|Align Left
文字置中|Align Center
文字靠右|Align Right
靠左|Align Left
置中|Align Center
靠右|Align Right
粗體|Bold
取消粗體|Remove Bold
斜體|Italic
底線|Underline
字體大小|Font Size
文字顏色|Text Color
儲存格底色|Cell Background
自動換行|Wrap Text
合併儲存格|Merge Cells
取消合併|Unmerge Cells
已合併|Merged
已取消合併|Unmerged
選取範圍遞增排序|Sort Selection Ascending
選取範圍遞減排序|Sort Selection Descending
建立篩選器|Create Filter
移除篩選器|Remove Filter
操作提示|Usage Tips
此操作無法套用於目前選取範圍|This action cannot be applied to the current selection
刪除此列|Delete Row
確定要刪除這一列嗎？|Delete this row?
輸入 Game List_Online 的記事…|Enter notes for Game List_Online…
找不到 GAME ID 表頭，請保留此欄位名稱|GAME ID header not found. Keep this column name.
彩金|Jackpot
點擊遊戲 ID 可查看對應的遊戲資料。|Click a Game ID to view its game information.
中文遊戲名稱。|Chinese game name.
由 Game List_Online 連動的英文遊戲名稱。|English game name linked from Game List_Online.
彩金資訊；未另外填寫時顯示來源表的彩金群組。|Jackpot information. Defaults to the jackpot group in the source sheet.
遊戲目前的上線狀態。|The game's current release status.
實際發行日期\n（正式環境）|Actual Release Date\n(PROD)
實際發行日期（正式環境）|Actual Release Date (PROD)
正式環境實際發行日期。|Actual release date in the PROD environment.
是否取得\nPagcor Approval|Pagcor Approval
是否取得 Pagcor Approval|Pagcor Approval
遊戲是否已取得 PAGCOR 核准。|Whether the game has PAGCOR approval.
是否支援\nFree Spin|Free Spin Support
是否支援 Free Spin|Free Spin Support
遊戲是否支援 Free Spin。|Whether the game supports Free Spin.
預計發行日期\n（可能會與實際發行日期不一致）|Planned Release Date\n(May Differ from Actual Release)
預計發行日期|Planned Release Date
預計日期僅供參考，可能會與正式環境實際發行日期不一致。|The planned date is for reference and may differ from the actual PROD release date.
備註 1\n（可備註特選／首發遊戲資訊）|Note 1\n(Special Release / Early Access)
備註 2\n（可備註聯名遊戲資訊）|Note 2\n(Co-branded Games)
可備註特選／首發遊戲資訊。|Notes about special release or early access games.
可備註聯名遊戲資訊。|Notes about co-branded games.
更新內部資料|Update Internal Data
更新中…|Updating…
已儲存至雲端|Saved to Cloud
完成並重新整理|Done & Refresh
遊戲資訊：保留原資料|Game information: keep existing data
遊戲資訊保留原資料。|Existing game information was retained.
線上清單已更新；正在更新遊戲資訊…|Online list updated. Updating game information…
遊戲資訊儲存中…|Saving game information…
請提供線上清單資料|Provide online game list data
遊戲資訊格式不正確|Invalid game information format
來源表格須包含 A:T 共 20 欄|The source grid must contain 20 columns (A:T)
來源表頭不正確|Invalid source headers
表頭合併範圍不正確|Invalid merged header ranges
現有試算表格式無法辨識|The existing spreadsheet format is not recognized
現有試算表缺少 GAME ID 表頭|The existing spreadsheet is missing the GAME ID header
線上清單儲存後比對未通過，請重試|Online list verification failed after saving. Try again.
請貼上至少一款遊戲|Paste at least one game
最多顯示最近 500 筆|Showing up to 500 recent records
操作（下載/強制登出）|Actions (Download / Force Logout)
起始日期|Start Date
結束日期|End Date
全部群組|All Groups
清除篩選|Clear Filters
依遊戲狀態篩選|Filter by Game Status
右鍵點標題可調整欄位顏色；右鍵點資料格可調色與編輯備註。|Right-click a header to change its color. Right-click a cell to change its color or edit its note.
貼上表格|Paste Table
搜尋遊戲資訊|Search Game Information
搜尋遊戲 ID、名稱或備註|Search Game ID, name, or notes
標題備註|Header Note
備註內容|Note Content
標題備註內容|Header Note Content
輸入這個欄位的說明、資料來源或提醒事項|Enter a description, source, or reminder for this field
儲存後，滑鼠移到此標題就會顯示。清空內容可移除備註。|After saving, hover over the header to view the note. Clear the content to remove it.
資料格備註|Cell Note
資料格備註內容|Cell Note Content
儲存後，滑鼠移到此資料格就會顯示。清空內容可移除備註。|After saving, hover over the cell to view the note. Clear the content to remove it.
沒有符合的遊戲|No matching games
編輯遊戲資訊|Edit Game Information
彩金（可同時選擇多個）|Jackpots (Multiple Selections)
新增彩金選項名稱|New Jackpot Option Name
輸入其他彩金名稱|Enter another jackpot name
＋ 新增選項|＋ Add Option
勾選的項目會在同一格上下排列。|Selected items are displayed on separate lines in the same cell.
備註 1（特選／首發遊戲資訊）|Note 1 (Special Release / Early Access)
備註 2（聯名遊戲資訊）|Note 2 (Co-branded Games)
刪除遊戲資訊|Delete Game Information
貼上遊戲資訊表格|Paste Game Information Table
依序貼上：遊戲 ID、中文名稱、英文名稱、彩金、狀態、實際發行日期、Pagcor Approval、Free Spin、預計發行日期、備註 1、備註 2。每款遊戲一列；日期使用 YYYY-MM-DD。彩金以「／」分隔可同時填入多個。|Paste columns in this order: Game ID, Chinese name, English name, jackpot, status, actual release date, Pagcor Approval, Free Spin, planned release date, Note 1, Note 2. Use one row per game and YYYY-MM-DD dates. Separate multiple jackpots with ／.
遊戲資訊表格內容|Game Information Table Content
從表格複製資料並貼上|Copy and paste data from a table
尚未貼上資料|No data pasted yet
儲存匯入|Save Import
＋ 新增列 ▾|＋ Add Row ▾
↑ 在選取列上方新增|↑ Insert Above Selected Row
↓ 在選取列下方新增|↓ Insert Below Selected Row
📝 記事|📝 Notes
儲存記事|Save Notes
搜尋試算表|Search Spreadsheet
上一筆|Previous Match
下一筆|Next Match
連動欄位設定|Linked Field Settings
每組數值各自指定可查看群組。勾選新值時，會自動取消該群組在舊值的勾選；未另指定的群組使用預設值。這裡維護文件顯示資料。|Assign groups to each value set. Selecting a new value removes that group's previous selection. Groups without a specific assignment use the default. These settings control displayed information.
選擇欄位|Select Field
＋ 新增一組數值|＋ Add Value Set
群組預覽|Group Preview
移除這組數值|Remove Value Set
正在載入登入畫面…|Loading login…
＋ 新增|＋ Add
🏢 所有平台列表|🏢 All Platforms
連接雲端中…|Connecting to cloud…
＋ 新增頁面|＋ Add Page
正在載入工作區…|Loading workspace…
正在取得雲端分類與頁面，請稍候。|Loading categories and pages from the cloud. Please wait.
新增分類|Add Category
分類名稱|Category Name
例如：VIP客戶、財務、產品資料|Example: VIP Customers, Finance, Product Information
建立分類|Create Category
新增分類／頁面|Add Category / Page
新分類名稱|New Category Name
輸入要新增的分類|Enter a new category
同時新增頁面|Also Add a Page
頁面名稱|Page Name
輸入頁面名稱|Enter page name
頁面類型|Page Type
📊 試算表|📊 Spreadsheet
📄 檔案 / PDF|📄 Files / PDF
🖼️ 照片|🖼️ Photos
🎬 影片|🎬 Videos
建立|Create
新增客戶群組|Add Customer Group
用群組整理不同類型的客戶。|Organize different types of customers into groups.
群組名稱|Group Name
例如：VIP客戶、代理商、內部人員|Example: VIP Customers, Agents, Internal Members
新增群組|Add Group
新增群組，或刪除目前未被平台使用的群組。|Add groups or delete groups that are not used by any platform.
＋ 新增群組分類|＋ Add Group Category
例如：ABC 公司|Example: ABC Company
例如：abc.com|Example: abc.com
新增客戶群組選項|Add Customer Group Option
新增對接進度選項|Add Integration Progress Option
平台正式上線日期|Platform Live Date
點擊選擇正式上線日期|Select platform live date
輸入客戶備註|Enter customer notes
新增所屬群組選項|Add Group Option
更新內部參考資料|Update Internal Reference Data
貼上匯入資料。依 Game ID 更新遊戲資訊；線上版本清單以本次資料為準。保留既有素材、群組權限與未列入的遊戲資訊。|Paste import data. Game information is updated by Game ID; the online version list is replaced with this import. Existing assets, group permissions, and unlisted game information are retained.
選擇匯入檔案|Choose Import File
選擇內部資料 JSON|Choose Internal Data JSON
內部參考匯入資料|Internal Reference Import Data
更新工作區|Update Workspace
搜尋 Game ID、中文或英文名稱|Search Game ID, Chinese or English name
展開遊戲選單|Expand Game Menu
可選遊戲|Available Games
例如：維護通知 UAT|Example: Maintenance Notice UAT
顏色與備註|Colors & Notes
欄位調色|Column Colors
表格外觀|Table Appearance
標籤顏色|Label Colors
自動套色|Conditional Colors
整張表格|Entire Table
底色|Background
表格底色|Table Background
交錯列底色|Alternating Row Background
標題文字|Header Text
標題底色|Header Background
請選擇欄位|Select Columns
選取的標籤|Selected Label
要調整的標籤|Label to Edit
符合條件的資料格（包含後續新增資料）；下方規則優先|Matching cells, including future data. Later rules take priority.
已發行標籤|Released Label
即將發行標籤|Coming Soon Label
特選遊戲標籤|Special Release Label
其他狀態標籤|Other Status Label
Yes 標籤|Yes Label
No 標籤|No Label
In Progress 標籤|In Progress Label
OP Jackpot 標籤|OP Jackpot Label
其他彩金標籤|Other Jackpot Label
查無日期|No Date Available
此遊戲不存在或目前帳號沒有查看權限 / Game unavailable or access denied|Game unavailable or access denied
目前沒有可下載的遊戲資料，請調整篩選條件。|No games available to download. Adjust the filters.
主要用在：\n\n• 新增使用者後，讓帳號可以登入。\n• 修改帳號或密碼後，更新登入資料。\n• 移除使用者後，停用舊帳號。\n• 更新群組權限、遊戲和檔案後，重新產生客戶可查看的資料。\n\n平常不用一直按。系統已有自動同步，這顆按鈕是同步失敗或資料沒更新時的手動補救。|Use this to:\n\n• Enable login for new members.\n• Apply account or password changes.\n• Disable removed accounts.\n• Refresh customer data after group permissions, games, or files change.\n\nThe system syncs automatically. Use this button if syncing fails or data is out of date.
先選取儲存格，再使用上方選單或下方格式工具列。\n插入備註：插入 → 插入備註，或在儲存格按右鍵。\n排序會套用於所選範圍；建立篩選器前請選取含標題的資料範圍。\n變更會自動儲存至雲端。|Select cells, then use the menus above or the formatting toolbar below.\nNotes: Insert → Insert Note, or right-click a cell.\nSorting applies to the selected range. Include the header row when creating a filter.\nChanges are saved to the cloud automatically.
恢復預設|Restore Defaults
包含文字|Text Contains
完全相同|Exact Match
調色|Colors
套用範圍：|Apply to:
同時調整其他欄位|Also Adjust Other Columns
請選擇至少一欄|Select at least one column
輸入備註，清空可移除|Enter a note; clear it to remove
修改|Modify
新增／修改條件|Add / Edit Condition
例如：特選遊戲|Example: Special Release
加入規則並預覽|Add Rule & Preview
請勾選欄位、輸入比對文字並選擇顏色|Select columns, enter matching text, and choose a color
規則已加入預覽，按儲存套用|Rule added to preview. Save to apply.
請先按「加入規則並預覽」，或清空未加入的條件|Select Add Rule & Preview first, or clear the pending condition
其他顏色設定|Other Color Settings
人員帳號不可使用管理員身分|Member accounts cannot use the administrator identity
請使用管理員登入|Log in as an administrator
找不到工作區資料|Workspace data not found
只有最高管理者可以設定群組權限|Only the owner can configure group permissions
找不到群組|Group not found
此群組的資料量超過單次同步上限|This group's data exceeds the limit for a single sync
客戶端資料未建立|Customer data has not been created
雲端客戶權限與勾選結果不一致，請重試|Cloud customer permissions do not match your selection. Try again.
雲端客戶資料缺少已開放頁面，請重試|Cloud customer data is missing an allowed page. Try again.
只有最高管理者可以管理權限|Only the owner can manage permissions
只有 Rondo 可以任免管理員|Only Rondo can appoint or remove administrators
不能變更 Rondo 的最高管理者身分|Rondo's owner role cannot be changed
無效的管理員權限|Invalid administrator permissions
此人員尚未啟用|This member is not enabled
其他群組只能查看與下載，不能設為管理員|Other groups can only view and download; they cannot be administrators
此工作區已完成最高管理者交接|Ownership of this workspace has already been transferred
請設定 Rondo 的登入密碼|Set Rondo's login password
找不到工作區|Workspace not found
人員密碼尚未完成移轉|Member password migration is incomplete
Rondo 的登入帳號尚未同步完成|Rondo's login account has not finished syncing
請先發布新版 Firebase 規則，再按「建立 Rondo 並交接」|Publish the updated Firebase rules, then select Create Rondo & Transfer Ownership
Rondo 的登入身分驗證失敗|Rondo's login identity verification failed
只有內部管理者可以預覽群組畫面|Only internal administrators can preview group views
此群組的遊戲資料尚未同步|This group's game information has not been synced
請先登入|Log in first
帳號尚未啟用|Account not enabled
客戶版遊戲資料尚未同步，請聯絡管理員|Customer game information has not been synced. Contact an administrator.
人員必須有識別碼及所屬群組|Members must have an ID and assigned group
個項目|items
已登出|Logged Out
登入狀態檢查|Login Status Check
讀取帳號權限|Loading Account Permissions
`.trim().split('\n').map(line=>line.split('|').map(value=>value.replace(/\\n/g,'\n')));
 const dictionary=new Map(pairs);
 const normalize=s=>String(s).replace(/\s+/g,' ').trim();
 const normalized=new Map(pairs.map(([zh,en])=>[normalize(zh),en]));
 const prefixes=[
 ['⚠️ 人員登入同步失敗：','⚠️ Member login sync failed: '],['人員登入未完成：','Member login incomplete: '],['套用範圍：','Apply to: '],['儲存失敗：','Save failed: '],['刪除失敗：','Delete failed: '],['上傳失敗：','Upload failed: '],['操作失敗：','Action failed: '],['操作失敗','Action failed'],['發布失敗：','Publish failed: '],['撤回失敗：','Withdrawal failed: '],['載入失敗：','Load failed: '],['資料載入失敗：','Data load failed: '],['試算表載入失敗：','Spreadsheet load failed: '],['登入失敗：','Login failed: '],['無法開啟遊戲資料：','Unable to open game information: '],['Pagcor Approval 載入失敗：','Unable to load Pagcor Approval: '],['下載失敗，請確認平台權限或重新登入：','Download failed. Check platform permissions or log in again: '],['權限同步失敗：','Permission sync failed: '],['類型更新失敗：','Type update failed: '],['更新未完成：','Update incomplete: '],['強制登出失敗：','Force logout failed: '],['☁️ 權限同步時間：','☁️ Permissions synced at: '],['⚠️ 權限即時更新失敗：','⚠️ Live permission update failed: '],['通知載入失敗，請重新整理後再試：','Unable to load notifications. Refresh and try again: '],['通知移轉失敗，請確認已發布新版 Firestore 規則後重新整理：','Notification migration failed. Publish the updated Firestore rules and refresh: '],['欄位已儲存，但群組同步失敗：','Fields saved, but group sync failed: '],['找不到對應的通知類型，請先在管理類型新增：','Notification type not found. Add it in Manage Types first: '],['預覽：','Preview: '],['上架時間：','Release Time: '],['獨立平台權限 · ','Platform-specific access · '],['通知說明日期 ','Description Date '],['額外數值 ','Additional Value '],['移除 ','Remove '],['刪除 ','Delete ']
 ];
 const patterns=[
 [/^-+(流程|首發|特選|其他)-+$/,name=>`-------${translate(name)}-------`],
 [/^([^\p{L}\p{N}\u3400-\u9fff]+)([\s\S]+)$/u,(prefix,rest)=>prefix+translate(rest)],
 [/^(.+?)\s+\/$/,label=>translate(label)+' /'],
 [/^([\s\S]+) ([#][0-9a-f]{6})$/i,(label,color)=>translate(label)+' '+color],
 [/^(.+) 已改用「([\s\S]*)」，不再套用原本的「([\s\S]*)」。請儲存以套用。$/,(name,next,old)=>`${name} now uses “${translate(next)}” instead of “${translate(old)}”. Save to apply.`],
 [/^(\d+) 款遊戲：新增 (\d+) 款，更新 (\d+) 款。儲存後依 Game ID 由小到大排列。$/,(total,added,updated)=>`${total} games: ${added} new, ${updated} updated. Sorted by Game ID after saving.`],
 [/^更新完成：Game List_Online (\d+) 筆。遊戲資訊 (\d+) 款。$/,(rows,games)=>`Updated: Game List_Online ${rows} rows; Game Information ${games} games.`],
 [/^更新完成：Game List_Online (\d+) 筆。遊戲資訊保留原資料。$/,rows=>`Updated: Game List_Online ${rows} rows. Existing game information retained.`],
 [/^遊戲資訊：(\d+) 款遊戲\nGame List_Online：(\d+) 筆版本資料\n實際與預計發行日期分開儲存。$/,(games,rows)=>`Game Information: ${games} games\nGame List_Online: ${rows} version rows\nActual and planned release dates are stored separately.`],
 [/^遊戲資訊：保留原資料\nGame List_Online：(\d+) 筆版本資料\n實際與預計發行日期分開儲存。$/,rows=>`Game Information: keep existing data\nGame List_Online: ${rows} version rows\nActual and planned release dates are stored separately.`],
 [/^遊戲資訊 (.+) 儲存後比對未通過，請重試$/,id=>`Game information ${id} failed verification after saving. Try again.`],
 [/^已選 (\d+) 欄$/,n=>`${n} columns selected`],
 [/^(.*)自選顏色$/,name=>`${translate(name)} Custom Color`],
 [/^編輯 (.*) 的標題備註$/,name=>`Edit ${translate(name)} Header Note`],
 [/^(.*)連線逾時，請重新載入後再試$/,name=>`${translate(name)} connection timed out. Reload and try again.`],
 [/^(\d+) 項$/,n=>`${n} items`],
 [/^(\d+) 個項目$/,n=>`${n} items`],
 [/^(\d+) 筆$/,n=>`${n} records`],
 [/^(\d+) 頁$/,n=>`${n} pages`],
 [/^可選 (\d+) 款遊戲$/,n=>`${n} games available`],
 [/^已加入 (\d+) 張圖片$/,n=>`${n} images added`],
 [/^通知，未讀 (\d+) 則$/,n=>`Notifications, ${n} unread`],
 [/^接收群組（(\d+)）(.*)$/, (n,rest)=>`Recipient Groups (${n})${rest}`],
 [/^顯示最近 (\d+) 則發布紀錄。上架時間為通知內容，按發布後立即通知所選群組。$/,n=>`Showing the latest ${n} published notifications. Release time is part of the content; publishing sends immediately to the selected groups.`],
 [/^已依遊戲所屬群組預設勾選 (\d+) 個接收群組，可手動調整；切換遊戲會重新帶入。$/,n=>`${n} recipient groups selected from the game's groups. You can adjust them; changing the game resets the selection.`],
 [/^確定要刪除檔案「([\s\S]*)」嗎？$/,name=>`Delete file “${name}”?`],
 [/^確定要刪除資料夾「([\s\S]*)」嗎？其下所有內容都會一併刪除。$/,name=>`Delete folder “${name}” and all its contents?`],
 [/^刪除「([\s\S]*)」？使用此選項的遊戲會改為「未設定」。$/,name=>`Delete “${name}”? Games using this option will be reset to Not Set.`],
 [/^確定將「([\s\S]*)」的所有網站連線登出？$/,name=>`Log out all website sessions for “${name}”?`],
 [/^刪除(分類|頁面)「([\s\S]*)」？$/,(kind,name)=>`Delete ${kind==='分類'?'category':'page'} “${name}”?`],
 [/^重新命名(分類|頁面)：$/,(kind)=>`Rename ${kind==='分類'?'category':'page'}:`],
 [/^確定移除「([\s\S]*)」(及其所有內容)?？$/,(name,all)=>`Remove “${name}”${all?' and all its contents':''}?`],
 [/^確定刪除 GAME ID ([\s\S]*)」？Game List_Online 中此遊戲的所有版本都會移除，已上傳的素材檔案會保留。$/,name=>`Delete Game ID ${name}”? All versions will be removed from Game List_Online. Uploaded assets will be retained.`],
 [/^確定從「遊戲資訊」移除 GAME ID ([\s\S]*)」？遊戲清單、Game List_Online 與素材檔案會保留。$/,name=>`Remove Game ID ${name}” from Game Information? Game List, Game List_Online, and assets will be retained.`],
 [/^工作區 \/ (.*)$/,name=>`Workspace / ${translate(name)}`],
 [/^(.*) 的角色$/,name=>`${name}'s Role`],
 [/^(.*) 的權限已更新；重新登入後套用。$/,name=>`${name}'s permissions were updated and apply after logging in again.`],
 [/^凍結至第\s*(\d+)\s*列$/,n=>`Freeze through Row ${n}`]
 ];
 function translate(value){
  const raw=String(value??''),trim=raw.trim();
  if(!trim)return raw;
  let next=dictionary.get(trim)??normalized.get(normalize(trim));
  if(next===undefined){for(const [pattern,render] of patterns){const match=trim.match(pattern);if(match){next=render(...match.slice(1));break;}}}
  if(next===undefined&&trim.includes('\n')){const lines=trim.split('\n').map(translate);if(lines.some((line,index)=>line!==trim.split('\n')[index]))next=lines.join('\n');}
  if(next===undefined){for(const [zh,en] of prefixes){if(trim.startsWith(zh)){next=en+translate(trim.slice(zh.length));break;}}}
  if(next===undefined)return raw;
  return raw.slice(0,raw.indexOf(trim))+next+raw.slice(raw.indexOf(trim)+trim.length);
 }
 const english=()=>{try{return localStorage.getItem('omniplay-customer-language')==='en'}catch{return document.documentElement.lang==='en'}};
 // These nodes contain authored or source data, rather than interface labels.
 const protectedContent='script,style,textarea,[contenteditable="true"],[data-i18n-ignore],.op-linked-item strong,.op-dialog-head h3,.op-dialog-head p,.op-browser-folder strong,.op-asset-view-item strong,.op-browser-crumbs,.resource-folder-name,.file-name,.login-user,.release-message-pair p,.release-title-pair h3,.release-card>h3,.release-card>p,.pagcor-item>span,.pagcor-head p,.release-game-names,.release-game-link,.release-image figcaption,.op-pills,.op-check-row strong,.release-recipients span,#groups .admin-row strong,#gameInformationTooltip,[data-gi-col="mandarinName"],[data-gi-col="name"],[data-gi-col="note1"],[data-gi-col="note2"],.univer-sheet-editor,.univer-cell-editor';
 const texts=new WeakMap(),attributes=new WeakMap(),validity=new WeakMap();
 for(const type of ['HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement']){
  const prototype=window[type]?.prototype,original=prototype?.setCustomValidity;
  if(original)prototype.setCustomValidity=function(message){const source=String(message??'');validity.set(this,{source,original});return original.call(this,english()?translate(source):source);};
 }
 const attrs=['title','placeholder','aria-label','label'];
 function textNode(node){
  if(!node.parentElement||node.parentElement.closest(protectedContent))return;
  const current=node.nodeValue,previous=texts.get(node),source=previous&&current===previous.output?previous.source:current;
  const output=english()?translate(source):source;
  if(output!==current)node.nodeValue=output;
  if(output!==source||previous)texts.set(node,{source,output});
 }
 function element(el){
  if(el.matches('script,style,[data-i18n-ignore]')||el.closest('[data-i18n-ignore]'))return;
  const validation=validity.get(el);if(validation)validation.original.call(el,english()?translate(validation.source):validation.source);
  let states=attributes.get(el);
  for(const name of attrs){if(!el.hasAttribute(name))continue;const current=el.getAttribute(name),previous=states?.[name],source=previous&&current===previous.output?previous.source:current,output=english()?translate(source):source;
   if(output!==current)el.setAttribute(name,output);
   if(output!==source||previous){if(!states){states={};attributes.set(el,states)}states[name]={source,output};}
  }
 }
 function refresh(root=document.body){
  if(!root)return;
  if(root.nodeType===3){textNode(root);return;}
  if(root.nodeType!==1)return;
  element(root);
  if(root.closest(protectedContent))return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:node=>{if(node.nodeType===1&&node.matches(protectedContent)){element(node);return NodeFilter.FILTER_REJECT;}return NodeFilter.FILTER_ACCEPT;}});
  let node;while((node=walker.nextNode()))node.nodeType===3?textNode(node):element(node);
 }
 let pending=new Set(),scheduled=false;
 const queue=root=>{pending.add(root);if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;const roots=[...pending];pending.clear();for(const root of roots)if(root.isConnected)refresh(root);});};
 const observer=new MutationObserver(mutations=>{for(const m of mutations){if(m.type==='attributes'&&m.target===document.documentElement){queue(document.body);continue;}if(m.type==='childList'){for(const node of m.addedNodes)queue(node);}else queue(m.target);}});
 observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang',...attrs]});
 // Browser dialogs have no DOM for the observer to translate.
 for(const name of ['alert','confirm','prompt']){const original=window[name].bind(window);window[name]=(message,...rest)=>original(english()?translate(message):message,...rest);}
 window.omniplayUI={text:value=>english()?translate(value):String(value??''),refresh,translate};
 document.documentElement.lang=english()?'en':'zh-Hant';
 window.addEventListener('storage',event=>{if(event.key==='omniplay-customer-language'){document.documentElement.lang=english()?'en':'zh-Hant';queue(document.body)}});
 document.addEventListener('DOMContentLoaded',()=>refresh());
 refresh();
})();

