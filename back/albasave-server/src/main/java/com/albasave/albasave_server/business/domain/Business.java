package com.albasave.albasave_server.business.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "businesses",
        indexes = {
                @Index(name = "idx_business_name", columnList = "name"),
                @Index(name = "idx_business_road_address", columnList = "roadAddress"),
                @Index(name = "idx_business_local_address", columnList = "localAddress"),
                @Index(name = "idx_business_source_key", columnList = "sourceFile,managementNumber", unique = true)
        }
)
public class Business {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(length = 1000)
    private String localAddress;

    @Column(length = 1000)
    private String roadAddress;

    @Column(length = 100)
    private String industry;

    @Column(length = 100)
    private String hygieneIndustry;

    @Column(length = 50)
    private String businessStatus;

    @Column(length = 50)
    private String detailStatus;

    @Column(length = 20)
    private String licenseDate;

    @Column(length = 20)
    private String closureDate;

    @Column(length = 50)
    private String phone;

    @Column(length = 80)
    private String serviceName;

    @Column(length = 30)
    private String serviceId;

    @Column(length = 80)
    private String managementNumber;

    @Column(length = 100)
    private String sourceFile;

    protected Business() {
    }

    public Business(
            String name,
            String localAddress,
            String roadAddress,
            String industry,
            String hygieneIndustry,
            String businessStatus,
            String detailStatus,
            String licenseDate,
            String closureDate,
            String phone,
            String serviceName,
            String serviceId,
            String managementNumber,
            String sourceFile
    ) {
        this.name = name;
        this.localAddress = localAddress;
        this.roadAddress = roadAddress;
        this.industry = industry;
        this.hygieneIndustry = hygieneIndustry;
        this.businessStatus = businessStatus;
        this.detailStatus = detailStatus;
        this.licenseDate = licenseDate;
        this.closureDate = closureDate;
        this.phone = phone;
        this.serviceName = serviceName;
        this.serviceId = serviceId;
        this.managementNumber = managementNumber;
        this.sourceFile = sourceFile;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getLocalAddress() {
        return localAddress;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public String getIndustry() {
        return industry;
    }

    public String getHygieneIndustry() {
        return hygieneIndustry;
    }

    public String getBusinessStatus() {
        return businessStatus;
    }

    public String getDetailStatus() {
        return detailStatus;
    }

    public String getLicenseDate() {
        return licenseDate;
    }

    public String getClosureDate() {
        return closureDate;
    }

    public String getPhone() {
        return phone;
    }

    public String getServiceName() {
        return serviceName;
    }

    public String getServiceId() {
        return serviceId;
    }

    public String getManagementNumber() {
        return managementNumber;
    }

    public String getSourceFile() {
        return sourceFile;
    }
}
