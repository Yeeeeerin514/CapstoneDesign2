package com.albasave.albasave_server.business.controller;

import com.albasave.albasave_server.business.dto.BusinessImportResponse;
import com.albasave.albasave_server.business.service.LocalDataBusinessImportService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/businesses")
public class BusinessImportController {
    private final LocalDataBusinessImportService importService;

    public BusinessImportController(LocalDataBusinessImportService importService) {
        this.importService = importService;
    }

    @PostMapping("/import-local-data")
    public BusinessImportResponse importLocalData(@RequestParam(required = false) Integer maxFiles) {
        return importService.importCsvFiles(maxFiles);
    }
}
