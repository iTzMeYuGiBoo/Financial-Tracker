package com.financetracker.dto;
import lombok.Data;
@Data public class BankAccountRequest { private String name; private String icon; private String color; private Long currencyId; private Double currentBalance; private Boolean isCreditCard; private Double creditLimit; }
