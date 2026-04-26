<?php

$host = "localhost";      
$username = "root";       
$password = "";           
$dbname = "attendance_db"; 


$conn = new mysqli($host, $username, $password, $dbname);


if ($conn->connect_error) {
   
    die(json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $conn->connect_error
    ]));
}


$conn->set_charset("utf8mb4");


?>