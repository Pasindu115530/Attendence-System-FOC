<?php
// 1. Database Connection
$host = "localhost";
$user = "root";
$pass = "";
$db   = "study_nest_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 2. Admin Details
$admin_name  = "Super Admin";
$admin_email = "admin@studynest.lk"; // Username for Login
$admin_nic   = "199012345678";       // Password for Login
$lecturer_id = "ADM/001";            // Custom ID for Admin
$dept_id     = 1;                    // Make sure Department ID 1 exists

// 3. Password Hashing (IMPORTANT)
$hashed_password = password_hash($admin_nic, PASSWORD_DEFAULT);

// 4. Start Transaction (Ekama welawe tables dekata danna ona nisa)
$conn->begin_transaction();

try {
    // A. Insert into USERS table (Auth Layer)
    $stmt1 = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')");
    $stmt1->bind_param("ss", $admin_email, $hashed_password);
    $stmt1->execute();
    
    $user_id = $conn->insert_id; // Get the generated ID

    // B. Insert into LECTURERS table (Profile Layer)
    $stmt2 = $conn->prepare("INSERT INTO lecturers (lecturer_id_code, user_id, full_name, email, nic, dept_id) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt2->bind_param("sisssi", $lecturer_id, $user_id, $admin_name, $admin_email, $admin_nic, $dept_id);
    $stmt2->execute();

    // Commit changes
    $conn->commit();
    echo "Super Admin created successfully!";

} catch (Exception $e) {
    // Something went wrong, rollback changes
    $conn->rollback();
    echo "Error: " . $e->getMessage();
}

$conn->close();
?>