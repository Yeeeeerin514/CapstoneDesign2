package com.albasave.albasave_server.jobposting.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Service
public class JobPostingImageStorageService {
    private final String bucket;
    private final String region;
    private final String accessKey;
    private final String secretKey;

    public JobPostingImageStorageService(
            @Value("${cloud.aws.s3.bucket:}") String bucket,
            @Value("${cloud.aws.region.static:ap-northeast-2}") String region,
            @Value("${cloud.aws.credentials.access-key:}") String accessKey,
            @Value("${cloud.aws.credentials.secret-key:}") String secretKey
    ) {
        this.bucket = bucket;
        this.region = region;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
    }

    public Optional<String> upload(MultipartFile image) {
        if (bucket == null || bucket.isBlank() || accessKey == null || accessKey.isBlank()
                || secretKey == null || secretKey.isBlank()) {
            return Optional.empty();
        }

        try (S3Client s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .build()) {
            String key = buildKey(image);
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType(image))
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(image.getBytes()));
            return Optional.of("https://" + bucket + ".s3." + region + ".amazonaws.com/" + key);
        } catch (IOException | RuntimeException exception) {
            return Optional.empty();
        }
    }

    private String buildKey(MultipartFile image) {
        LocalDate now = LocalDate.now();
        return "job-postings/%04d/%02d/%02d/%s%s".formatted(
                now.getYear(),
                now.getMonthValue(),
                now.getDayOfMonth(),
                UUID.randomUUID(),
                extension(image)
        );
    }

    private String contentType(MultipartFile image) {
        return image.getContentType() == null || image.getContentType().isBlank()
                ? "image/jpeg"
                : image.getContentType();
    }

    private String extension(MultipartFile image) {
        String filename = image.getOriginalFilename();
        if (filename == null) {
            return ".jpg";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return ".jpg";
        }
        return filename.substring(dot).replaceAll("[^A-Za-z0-9.]", "");
    }
}
