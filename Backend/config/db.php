<?php
$host = "localhost";
$username = "root";
$password = "";
$dbname = "study_nest_db";

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $conn->connect_error
    ]));
}

// Charset එක set කිරීම වැදගත්
$conn->set_charset("utf8mb4");

// මෙතනින් පස්සේ කිසිම ECHO එකක් තියෙන්න බැහැ!
?>