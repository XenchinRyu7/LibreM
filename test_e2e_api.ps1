# ==============================================================================
# LibreM End-to-End API Integration & Dataflow Test Suite
# Tests all core modules: Auth, Stats, Catalog, Items, Members, Circulation, Visitors, CRUD Delete
# ==============================================================================

$BaseUrl = "http://127.0.0.1:8080/api/v1"
$ErrorActionPreference = "Stop"
$Passed = 0
$Failed = 0

function Report-Test($Name, $Success, $Details = "") {
    if ($Success) {
        $global:Passed++
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        if ($Details) { Write-Host "         $Details" -ForegroundColor DarkGray }
    } else {
        $global:Failed++
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        if ($Details) { Write-Host "         $Details" -ForegroundColor Yellow }
    }
}

function Get-ErrorDetails($ex) {
    if ($ex.Response) {
        try {
            $stream = $ex.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            return $reader.ReadToEnd()
        } catch {
            return $ex.Message
        }
    }
    return $ex.Message
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Running LibreM Full API & Data Flow Verification..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Health Endpoint
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Report-Test "1. Health Endpoint" ($res.status -eq "healthy") "Version: $($res.version), Machine: $($res.machine_id)"
} catch {
    Report-Test "1. Health Endpoint" $false (Get-ErrorDetails $_.Exception)
}

# 2. Setup Status
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/setup/status" -Method Get
    Report-Test "2. Setup Status" ($null -ne $res) "Machine: $($res.machine_id)"
} catch {
    Report-Test "2. Setup Status" $false (Get-ErrorDetails $_.Exception)
}

# 3. Setup License Verification
try {
    $body = @{ license_token = "LIBREM-2026-TRIAL-COMMERCIAL-UNLIMITED" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/setup/verify-license" -Method Post -Body $body -ContentType "application/json"
    Report-Test "3. License Verification" ($res.status -eq "VALID") "Status: $($res.status), Licensee: $($res.licensee)"
} catch {
    Report-Test "3. License Verification" $false (Get-ErrorDetails $_.Exception)
}

# 4. Authentication (Login)
$Token = ""
try {
    $body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    $Token = $res.token
    Report-Test "4. Superadmin Login" ($null -ne $Token -and $Token.Length -gt 20) "JWT Token received successfully"
} catch {
    Report-Test "4. Superadmin Login" $false (Get-ErrorDetails $_.Exception)
}

$Headers = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "application/json"
}

# 5. Protected Auth Me
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method Get -Headers $Headers
    Report-Test "5. Auth Me (Protected)" ($res.user.username -eq "admin") "User: $($res.user.username), Role: $($res.user.role)"
} catch {
    Report-Test "5. Auth Me (Protected)" $false (Get-ErrorDetails $_.Exception)
}

# 6. Library Info (Public Stats)
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/stats/library-info" -Method Get
    Report-Test "6. Library Info" ($null -ne $res.name) "Library: $($res.name)"
} catch {
    Report-Test "6. Library Info" $false (Get-ErrorDetails $_.Exception)
}

# 7. Dashboard Stats (Protected)
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/stats/dashboard" -Method Get -Headers $Headers
    Report-Test "7. Dashboard Stats" ($null -ne $res) "Titles: $($res.total_biblios), Items: $($res.total_items), Loans: $($res.active_loans)"
} catch {
    Report-Test "7. Dashboard Stats" $false (Get-ErrorDetails $_.Exception)
}

# 8. Catalog Masters (GMD, Publishers, Places, etc.)
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/catalog/masters" -Method Get
    Report-Test "8. Catalog Masters" ($res.gmds.Count -gt 0) "GMD items: $($res.gmds.Count), Publishers: $($res.publishers.Count)"
} catch {
    Report-Test "8. Catalog Masters" $false (Get-ErrorDetails $_.Exception)
}

# 9. Create New Biblio
$BiblioID = 0
try {
    $body = @{
        title = "Automated Test Book $(Get-Random)"
        sor = "Antigravity Test Agent"
        isbn_issn = "978-602-0000-01-X"
        publish_year = "2026"
        edition = "1st"
        classification = "004.6"
        call_number = "004.6 ANT a"
        language_code = "id"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/catalog/biblios" -Method Post -Headers $Headers -Body $body
    $BiblioID = $res.id
    Report-Test "9. Create Bibliography (Biblio)" ($BiblioID -gt 0) "Created ID: $BiblioID, Title: $($res.title)"
} catch {
    Report-Test "9. Create Bibliography" $false (Get-ErrorDetails $_.Exception)
}

# 10. List & Search Biblios
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/catalog/biblios?q=Automated" -Method Get
    Report-Test "10. Search Biblios" ($res.data.Count -gt 0) "Found $($res.data.Count) matching titles"
} catch {
    Report-Test "10. Search Biblios" $false (Get-ErrorDetails $_.Exception)
}

# 11. Add Physical Items to Biblio (Batch Item Barcode Generation)
$CreatedBarcode = ""
$CreatedItemID = 0
try {
    $body = @{
        biblio_id = [int64]$BiblioID
        barcode_prefix = "TST"
        quantity = 1
        price = 75000
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/catalog/items/batch" -Method Post -Headers $Headers -Body $body
    $CreatedBarcode = $res.generated_items[0].barcode
    $CreatedItemID = $res.generated_items[0].id
    Report-Test "11. Batch Create Physical Items" ($res.total_created -gt 0) "Generated Item ID: $CreatedItemID, Barcode: $CreatedBarcode"
} catch {
    Report-Test "11. Batch Create Physical Items" $false (Get-ErrorDetails $_.Exception)
}

# 12. Lookup Item By Barcode
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/catalog/items/$CreatedBarcode" -Method Get -Headers $Headers
    Report-Test "12. Lookup Item By Barcode" ($res.barcode -eq $CreatedBarcode) "Status Lent: $($res.is_lent), Title: $($res.biblio_title)"
} catch {
    Report-Test "12. Lookup Item By Barcode" $false (Get-ErrorDetails $_.Exception)
}

# 13. Member Types
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/members/types" -Method Get -Headers $Headers
    Report-Test "13. Member Types" ($res.Count -gt 0) "Loaded $($res.Count) member types"
} catch {
    Report-Test "13. Member Types" $false (Get-ErrorDetails $_.Exception)
}

# 14. Create New Member
$TestMemberID = "MBR$(Get-Random -Minimum 1000 -Maximum 9999)"
try {
    $body = @{
        id = $TestMemberID
        full_name = "Anggota Pengujian Otomatis"
        gender = "M"
        member_type_id = 1
        email = "member_test@example.com"
        phone = "08123456789"
        address = "Jl. Uji Integrasi No. 1"
        institution = "Kelas XII IPA 1"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/members" -Method Post -Headers $Headers -Body $body
    Report-Test "14. Create Member" ($res.id -eq $TestMemberID) "Registered Member ID: $($res.id), Name: $($res.full_name)"
} catch {
    Report-Test "14. Create Member" $false (Get-ErrorDetails $_.Exception)
}

# 15. Circulation: Checkout (Borrow Item)
$LoanID = 0
try {
    $body = @{
        member_id = $TestMemberID
        barcode = $CreatedBarcode
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/circulation/checkout" -Method Post -Headers $Headers -Body $body
    $LoanID = $res.id
    Report-Test "15. Circulation Checkout (Peminjaman)" ($LoanID -gt 0) "Loan ID: $LoanID, Due Date: $($res.due_date), Book: $($res.biblio_title)"
} catch {
    Report-Test "15. Circulation Checkout" $false (Get-ErrorDetails $_.Exception)
}

# 16. Circulation: Member Active Loans
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/circulation/loans/member/$TestMemberID" -Method Get -Headers $Headers
    Report-Test "16. Member Active Loans Query" ($res.Count -gt 0) "Member has $($res.Count) active loan(s)"
} catch {
    Report-Test "16. Member Active Loans Query" $false (Get-ErrorDetails $_.Exception)
}

# 17. Circulation: Renew Loan
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/circulation/renew/$LoanID" -Method Post -Headers $Headers -Body "{}"
    Report-Test "17. Circulation Renew (Perpanjangan)" ($res.renewed_count -gt 0) "Renewed Count: $($res.renewed_count), New Due Date: $($res.due_date)"
} catch {
    Report-Test "17. Circulation Renew" $false (Get-ErrorDetails $_.Exception)
}

# 18. Circulation: Checkin (Quick Return / Pengembalian)
try {
    $body = @{ barcode = $CreatedBarcode } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/circulation/checkin" -Method Post -Headers $Headers -Body $body
    Report-Test "18. Circulation Checkin (Pengembalian)" ($res.title -ne "") "Book: $($res.title), Return Date: $($res.return_date), Fine: Rp $($res.fine_amount)"
} catch {
    Report-Test "18. Circulation Checkin" $false (Get-ErrorDetails $_.Exception)
}

# 19. Circulation: Overdues List
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/circulation/overdues" -Method Get -Headers $Headers
    Report-Test "19. Circulation Overdues Query" ($null -ne $res) "Overdue records response valid"
} catch {
    Report-Test "19. Circulation Overdues Query" $false (Get-ErrorDetails $_.Exception)
}

# 20. Circulation: Fines List
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/circulation/fines" -Method Get -Headers $Headers
    Report-Test "20. Circulation Fines Query" ($null -ne $res) "Fines ledger response valid"
} catch {
    Report-Test "20. Circulation Fines Query" $false (Get-ErrorDetails $_.Exception)
}

# 21. Visitor Kiosk: Check-in (Buku Tamu)
try {
    $body = @{
        member_id = $TestMemberID
        visitor_name = "Anggota Pengujian Otomatis"
        institution = "SMA Negeri 1 Testing"
        gender = "M"
        purpose = "Membaca & Meminjam Buku"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/visitors/checkin" -Method Post -Body $body -ContentType "application/json"
    Report-Test "21. Visitor Check-in (Kiosk)" ($res.id -gt 0) "Visitor: $($res.visitor_name), Checkin Time: $($res.checkin_time)"
} catch {
    Report-Test "21. Visitor Check-in" $false (Get-ErrorDetails $_.Exception)
}

# 22. Visitor Kiosk: Today's Visitors
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/visitors/today" -Method Get
    Report-Test "22. Visitors Today Query" ($res.Count -gt 0) "Today's visitor count: $($res.Count)"
} catch {
    Report-Test "22. Visitors Today Query" $false (Get-ErrorDetails $_.Exception)
}

# 23. CRUD Deletion Lifecycle: Dedicated temporary item
try {
    $tempBiblio = Invoke-RestMethod -Uri "$BaseUrl/catalog/biblios" -Method Post -Headers $Headers -Body '{"title":"Del Book","publish_year":"2026","language_code":"id"}'
    $tempItem = Invoke-RestMethod -Uri "$BaseUrl/catalog/items/batch" -Method Post -Headers $Headers -Body "{`"biblio_id`": $($tempBiblio.id), `"quantity`": 1}"
    $tItemId = $tempItem.generated_items[0].id
    $delItem = Invoke-RestMethod -Uri "$BaseUrl/catalog/items/$tItemId" -Method Delete -Headers $Headers
    Report-Test "23. CRUD Delete Item" ($delItem.message -ne "") "$($delItem.message) (ID: $tItemId)"
} catch {
    Report-Test "23. CRUD Delete Item" $false (Get-ErrorDetails $_.Exception)
}

# 24. CRUD Deletion Lifecycle: Dedicated temporary biblio
try {
    $delBiblio = Invoke-RestMethod -Uri "$BaseUrl/catalog/biblios/$($tempBiblio.id)" -Method Delete -Headers $Headers
    Report-Test "24. CRUD Delete Biblio" ($delBiblio.message -ne "") "$($delBiblio.message) (ID: $($tempBiblio.id))"
} catch {
    Report-Test "24. CRUD Delete Biblio" $false (Get-ErrorDetails $_.Exception)
}

# 25. CRUD Deletion Lifecycle: Dedicated temporary member
try {
    $tMemId = "DEL" + (Get-Random -Minimum 1000 -Maximum 9999)
    $tMemBody = @{ id = $tMemId; full_name = "Del Member"; member_type_id = 1; gender = "M" } | ConvertTo-Json
    $tempMem = Invoke-RestMethod -Uri "$BaseUrl/members" -Method Post -Headers $Headers -Body $tMemBody
    $delMem = Invoke-RestMethod -Uri "$BaseUrl/members/$tMemId" -Method Delete -Headers $Headers
    Report-Test "25. CRUD Delete Member" ($delMem.message -ne "") "$($delMem.message) (ID: $tMemId)"
} catch {
    Report-Test "25. CRUD Delete Member" $false (Get-ErrorDetails $_.Exception)
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TEST RUN COMPLETED: $Passed Passed, $Failed Failed" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    exit 1
} else {
    exit 0
}
