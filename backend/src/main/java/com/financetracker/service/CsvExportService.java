package com.financetracker.service;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.*;
@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsvExportService {
    private final TransactionRepository txRepo; private final UserService userService;
    public String exportTransactionsCsv() throws IOException {
        var sw=new StringWriter();
        try(var p=new CSVPrinter(sw,CSVFormat.DEFAULT.builder().setHeader("ID","Date","Description","Type","Amount","Category","Bank Account","Note","CO2 (kg)").build())){
            for(var t:txRepo.findByUserOrderByDateDescCreatedAtDesc(userService.getCurrentUser())){
                p.printRecord(t.getId(),t.getDate(),t.getDescription(),t.getType().name(),t.getAmount(),t.getCategory().getName(),t.getBankAccount()!=null?t.getBankAccount().getName():"",t.getNote()!=null?t.getNote():"",t.getCo2Kg());
            }
        }
        return sw.toString();
    }
}
