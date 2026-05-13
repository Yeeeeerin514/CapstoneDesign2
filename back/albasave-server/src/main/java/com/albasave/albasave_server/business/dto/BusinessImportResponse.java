package com.albasave.albasave_server.business.dto;

public record BusinessImportResponse(
        int scannedFiles,
        long importedRows,
        long skippedRows,
        long totalBusinesses
) {
}
