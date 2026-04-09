import { Injectable } from '@nestjs/common';

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  preview: string;
}

@Injectable()
export class EmailTemplateService {
  getTemplates(): EmailTemplate[] {
    return [
      {
        id: 'welcome',
        name: 'Welcome Email',
        category: 'onboarding',
        description: 'A warm welcome email for new subscribers or users.',
        preview: 'Welcome aboard! We are excited to have you.',
      },
      {
        id: 'newsletter',
        name: 'Newsletter',
        category: 'marketing',
        description: 'A clean newsletter layout with header, content sections, and footer.',
        preview: 'Your monthly update with the latest news and tips.',
      },
      {
        id: 'promotion',
        name: 'Promotional Offer',
        category: 'sales',
        description: 'Eye-catching promotional email with call-to-action buttons.',
        preview: 'Special offer just for you - limited time only!',
      },
      {
        id: 'announcement',
        name: 'Product Announcement',
        category: 'marketing',
        description: 'Announce new products, features, or company updates.',
        preview: 'Exciting news! Check out what is new.',
      },
      {
        id: 'followup',
        name: 'Follow Up',
        category: 'sales',
        description: 'A friendly follow-up email for leads and prospects.',
        preview: 'Just checking in - we would love to hear from you.',
      },
    ];
  }

  getTemplateHtml(templateId: string): string {
    const templates: Record<string, string> = {
      welcome: this.getWelcomeTemplate(),
      newsletter: this.getNewsletterTemplate(),
      promotion: this.getPromotionTemplate(),
      announcement: this.getAnnouncementTemplate(),
      followup: this.getFollowUpTemplate(),
    };

    return templates[templateId] || this.getDefaultTemplate();
  }

  renderTemplate(html: string, variables: Record<string, string>): string {
    let rendered = html;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return rendered;
  }

  private getWelcomeTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to {{company}}!</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Thank you for joining us! We are thrilled to have you on board. You have made a great decision, and we are here to help you get the most out of your experience.</p>
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Here is what you can do next:</p>
              <!-- Feature List -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #eef2ff; border-radius: 8px; text-align: center; vertical-align: middle; color: #6366f1; font-weight: bold;">1</td>
                        <td style="padding-left: 16px; color: #374151; font-size: 15px;">Complete your profile to personalize your experience</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #eef2ff; border-radius: 8px; text-align: center; vertical-align: middle; color: #6366f1; font-weight: bold;">2</td>
                        <td style="padding-left: 16px; color: #374151; font-size: 15px;">Explore our features and tools</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #eef2ff; border-radius: 8px; text-align: center; vertical-align: middle; color: #6366f1; font-weight: bold;">3</td>
                        <td style="padding-left: 16px; color: #374151; font-size: 15px;">Create your first campaign</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="{{dashboard_url}}" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Get Started</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">{{company}}</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getNewsletterTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0 0 4px; color: #ffffff; font-size: 24px; font-weight: 700;">{{company}} Newsletter</h1>
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">{{newsletter_date}}</p>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 16px;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 12px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">Here is your latest roundup of news, tips, and updates.</p>
            </td>
          </tr>
          <!-- Featured Article -->
          <tr>
            <td style="padding: 16px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 4px; color: #15803d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Featured</p>
                    <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">{{featured_title}}</h2>
                    <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px; line-height: 1.5;">{{featured_summary}}</p>
                    <a href="{{featured_url}}" style="color: #22c55e; font-size: 14px; font-weight: 600; text-decoration: none;">Read more &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Article Section -->
          <tr>
            <td style="padding: 16px 40px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Latest Updates</h3>
              <!-- Article 1 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px; color: #111827; font-size: 15px; font-weight: 600;">{{article1_title}}</h4>
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; line-height: 1.5;">{{article1_summary}}</p>
                    <a href="{{article1_url}}" style="color: #6366f1; font-size: 13px; font-weight: 600; text-decoration: none;">Read more &rarr;</a>
                  </td>
                </tr>
              </table>
              <!-- Article 2 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px; color: #111827; font-size: 15px; font-weight: 600;">{{article2_title}}</h4>
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; line-height: 1.5;">{{article2_summary}}</p>
                    <a href="{{article2_url}}" style="color: #6366f1; font-size: 13px; font-weight: 600; text-decoration: none;">Read more &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Tip / CTA Box -->
          <tr>
            <td style="padding: 16px 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eef2ff; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="margin: 0 0 12px; color: #4338ca; font-size: 15px; font-weight: 600;">{{cta_text}}</p>
                    <a href="{{cta_url}}" style="display: inline-block; padding: 10px 24px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px;">{{cta_button}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">{{company}}</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You are receiving this because you subscribed to our newsletter.
                <br>
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getPromotionTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Special Offer</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899, #f97316); padding: 48px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Limited Time Offer</p>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 42px; font-weight: 800;">{{discount_amount}}</h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">{{offer_headline}}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">{{offer_description}}</p>
              <!-- Promo Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border: 2px dashed #e5e7eb; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px 32px; text-align: center;">
                          <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Use Code</p>
                          <p style="margin: 0; color: #111827; font-size: 24px; font-weight: 800; letter-spacing: 2px;">{{promo_code}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="{{offer_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899, #f97316); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 8px;">Shop Now</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">Offer expires {{expiry_date}}. Terms and conditions apply.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">{{company}}</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getAnnouncementTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Announcement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Announcement</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">{{announcement_title}}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">{{announcement_body}}</p>
              <!-- Highlight Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0; background-color: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.5;">{{highlight_text}}</p>
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="{{announcement_url}}" style="display: inline-block; padding: 14px 32px; background-color: #1e293b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Learn More</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">{{company}}</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getFollowUpTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Follow Up</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Just Checking In</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">I wanted to follow up on our recent conversation. I hope you have had a chance to review the information we shared.</p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">{{followup_message}}</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">If you have any questions or need further assistance, please do not hesitate to reach out. We are here to help!</p>
              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="{{meeting_url}}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Schedule a Call</a>
                  </td>
                </tr>
              </table>
              <!-- Signature -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; color: #111827; font-size: 15px; font-weight: 600;">{{sender_name}}</p>
                    <p style="margin: 0 0 2px; color: #6b7280; font-size: 13px;">{{sender_title}}</p>
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">{{company}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{name}},</p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">{{content}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">{{company}}</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
