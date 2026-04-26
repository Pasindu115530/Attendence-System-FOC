<?php
header('Content-Type: application/json');

echo json_encode([
    "status" => "active",
    "message" => "StudyNest Backend API is running",
    "environment" => "Render Cloud",
    "database_config" => [
        "host_status" => getenv('DB_HOST') ? "Configured" : "Missing",
        "port" => getenv('DB_PORT') ?: "6543"
    ]
]);
?>