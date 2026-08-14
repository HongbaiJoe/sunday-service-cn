declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
    TENCENT_SECRET_ID: string;
    TENCENT_SECRET_KEY: string;
    TENCENT_SMS_SDK_APP_ID: string;
    TENCENT_SMS_SIGN_NAME: string;
    TENCENT_SMS_TEMPLATE_ID: string;
    RESEND_API_KEY: string;
    RESEND_FROM: string;
  }
}
