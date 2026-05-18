' start-artbook.vbs — 아트북 제작기 로컬 서버 숨김 실행 (부팅/로그온 자동시작용)
' 콘솔 창 없이 node server.js 를 백그라운드로 띄운다. 외부망 미사용.
CreateObject("WScript.Shell").Run "cmd /c cd /d ""D:\Claude_works\make_book"" && ""C:\Program Files\nodejs\node.exe"" server.js", 0, False
