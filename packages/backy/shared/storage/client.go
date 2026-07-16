package storage

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var defaultBuckets = []string{
	"avatars-workspaces",
	"avatars-spaces",
	"avatars-profiles",
}

// Client wraps an S3 client configured for RustFS.
type Client struct {
	s3     *s3.Client
	logger zerolog.Logger
}

// NewClient creates a new S3 client targeting RustFS.
func NewClient() (*Client, error) {
	endpoint := os.Getenv("RUSTFS_ENDPOINT")
	if endpoint == "" {
		endpoint = "http://localhost:90000"
	}

	accessKey := os.Getenv("RUSTFS_ACCESS_KEY")
	if accessKey == "" {
		accessKey = "verso"
	}

	secretKey := os.Getenv("RUSTFS_SECRET_KEY")
	if secretKey == "" {
		secretKey = "verso_secret_key"
	}

	region := os.Getenv("RUSTFS_REGION")
	if region == "" {
		region = "us-east-1"
	}

	cfg, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = os.Getenv("RUSTFS_PATH_STYLE") != "false"
	})

	return &Client{
		s3:     client,
		logger: log.With().Str("component", "storage").Logger(),
	}, nil
}

// EnsureBuckets checks that all default buckets exist and creates them if not.
func (c *Client) EnsureBuckets(ctx context.Context) error {
	for _, bucket := range defaultBuckets {
		if err := c.ensureBucket(ctx, bucket); err != nil {
			c.logger.Error().Err(err).Str("bucket", bucket).Msg("failed to ensure bucket")
			return fmt.Errorf("ensure bucket %q: %w", bucket, err)
		}
	}
	return nil
}

func (c *Client) ensureBucket(ctx context.Context, bucket string) error {
	_, err := c.s3.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(bucket),
	})
	if err == nil {
		c.logger.Info().Str("bucket", bucket).Msg("bucket already exists")
		return nil
	}

	c.logger.Info().Str("bucket", bucket).Msg("creating bucket")
	_, err = c.s3.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		return fmt.Errorf("create bucket: %w", err)
	}

	c.logger.Info().Str("bucket", bucket).Msg("bucket created")
	return nil
}

// S3 returns the underlying S3 client.
func (c *Client) S3() *s3.Client {
	return c.s3
}

// DeleteBucketAndObjects deletes all objects in the bucket, then deletes the bucket itself.
func (c *Client) DeleteBucketAndObjects(ctx context.Context, bucket string) error {
	in := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
	}
	for {
		out, err := c.s3.ListObjectsV2(ctx, in)
		if err != nil {
			var apiErr smithy.APIError
			if errors.As(err, &apiErr) {
				code := apiErr.ErrorCode()
				if code == "NoSuchBucket" || code == "NoSuchKey" || code == "NotFound" {
					return nil
				}
			}
			return fmt.Errorf("list objects: %w", err)
		}
		if len(out.Contents) == 0 {
			break
		}

		var objects []types.ObjectIdentifier
		for _, obj := range out.Contents {
			objects = append(objects, types.ObjectIdentifier{
				Key: obj.Key,
			})
		}

		_, err = c.s3.DeleteObjects(ctx, &s3.DeleteObjectsInput{
			Bucket: aws.String(bucket),
			Delete: &types.Delete{
				Objects: objects,
			},
		})
		if err != nil {
			return fmt.Errorf("delete objects: %w", err)
		}

		if out.IsTruncated != nil && *out.IsTruncated {
			in.ContinuationToken = out.NextContinuationToken
		} else {
			break
		}
	}

	_, err := c.s3.DeleteBucket(ctx, &s3.DeleteBucketInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "NoSuchBucket") || strings.Contains(errStr, "404") {
			return nil
		}
		return fmt.Errorf("delete bucket: %w", err)
	}

	return nil
}
