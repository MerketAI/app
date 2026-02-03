import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Random data generators
const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Ashley', 'Robert', 'Amanda', 'William', 'Stephanie', 'Daniel', 'Nicole', 'Matthew'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas'];

const businessTypes = [
  'Digital Marketing Agency',
  'E-commerce Store',
  'Tech Startup',
  'Consulting Firm',
  'Creative Studio',
  'Fitness Center',
  'Restaurant',
  'Real Estate Agency',
  'Healthcare Clinic',
  'Education Platform',
  'Travel Agency',
  'Fashion Boutique',
  'Photography Studio',
  'Law Firm',
  'Financial Services',
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Marketing',
  'Real Estate',
  'Food & Beverage',
  'Travel & Tourism',
  'Entertainment',
  'Fashion',
  'Fitness',
  'Legal',
  'Consulting',
  'Manufacturing',
];

const descriptions = [
  'We help businesses grow through innovative digital solutions.',
  'Delivering exceptional quality and service to our valued customers.',
  'Transforming ideas into reality with cutting-edge technology.',
  'Your trusted partner for all your business needs.',
  'Creating memorable experiences that inspire and delight.',
  'Empowering people to achieve their goals.',
  'Building the future, one project at a time.',
  'Excellence in every detail, passion in every project.',
  'Connecting people with the services they need.',
  'Innovation meets tradition for exceptional results.',
  'Where quality meets affordability.',
  'Your success is our mission.',
  'Dedicated to making a difference.',
  'Setting new standards in our industry.',
  'Committed to excellence and customer satisfaction.',
];

const slugPrefixes = [
  'awesome', 'digital', 'creative', 'smart', 'pro', 'elite', 'prime',
  'next', 'ultra', 'mega', 'super', 'top', 'best', 'alpha', 'nova'
];

const slugSuffixes = [
  'hub', 'studio', 'works', 'labs', 'tech', 'co', 'group',
  'solutions', 'agency', 'media', 'zone', 'space', 'point', 'base', 'hq'
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlug(index: number): string {
  return `${randomElement(slugPrefixes)}-${randomElement(slugSuffixes)}-${index}`;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateRazorpayOrderId(): string {
  return `order_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
}

function generateRazorpayPaymentId(): string {
  return `pay_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
}

function generateRazorpaySignature(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

// Payment amounts in paise for each tier
const tierPricing: Record<string, { monthly: number; yearly: number }> = {
  'STARTER': { monthly: 49900, yearly: 499000 },      // ₹499/month or ₹4,990/year
  'PROFESSIONAL': { monthly: 149900, yearly: 1499000 }, // ₹1,499/month or ₹14,990/year
  'BUSINESS': { monthly: 399900, yearly: 3999000 },   // ₹3,999/month or ₹39,990/year
};

const paymentStatuses = ['PAID', 'PAID', 'PAID', 'PAID', 'FAILED', 'REFUNDED']; // Weighted towards PAID
const creditTransactionTypes = ['SUBSCRIPTION', 'USAGE', 'BONUS', 'REFUND'];

async function main() {
  console.log('Starting seed...');

  // Clean up existing seed data (users with @example.com emails)
  console.log('Cleaning up existing seed data...');
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        contains: '@example.com',
      },
    },
  });

  if (existingUsers.length > 0) {
    console.log(`  Deleting ${existingUsers.length} existing test user(s)...`);
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@example.com',
        },
      },
    });
  }

  // Hash password once (all test users will have same password: "password123")
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Admin user
  console.log('Creating Admin user...');
  const adminEmail = 'admin@jasper.app';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: 'System Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    console.log('  Admin user created: admin@jasper.app / admin123');
  } else {
    console.log('  Admin user already exists');
  }

  // Also create/update the user's admin account if they want
  const userAdminEmail = 'uxd.arjun@gmail.com';
  const userAdminPasswordHash = await bcrypt.hash('admin123', 10);
  const existingUserAdmin = await prisma.user.findUnique({ where: { email: userAdminEmail } });

  if (!existingUserAdmin) {
    await prisma.user.create({
      data: {
        email: userAdminEmail,
        passwordHash: userAdminPasswordHash,
        name: 'Arjun Kumar',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    console.log(`  User admin created: ${userAdminEmail} / admin123`);
  } else {
    // Update existing user to ensure they have ADMIN role and known password
    await prisma.user.update({
      where: { email: userAdminEmail },
      data: {
        role: 'ADMIN',
        passwordHash: userAdminPasswordHash,
      },
    });
    console.log(`  User ${userAdminEmail} updated with ADMIN role and password: admin123`);
  }

  const users = [];

  for (let i = 1; i <= 15; i++) {
    const firstName = firstNames[i - 1];
    const lastName = randomElement(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = generateEmail(firstName, lastName, i);
    const businessName = `${firstName}'s ${randomElement(businessTypes)}`;
    const industry = randomElement(industries);
    const description = randomElement(descriptions);
    const workspaceSlug = generateSlug(i);
    const workspaceName = `${firstName}'s Workspace`;

    // Random dates within last 6 months
    const createdAt = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date());
    const periodStart = new Date(createdAt);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Random subscription tier
    const tiers = ['STARTER', 'STARTER', 'STARTER', 'PROFESSIONAL', 'PROFESSIONAL', 'BUSINESS'];
    const tier = randomElement(tiers);
    const creditsMap: Record<string, number> = {
      'STARTER': 100,
      'PROFESSIONAL': 500,
      'BUSINESS': 2000,
    };
    const totalCredits = creditsMap[tier];
    const usedCredits = Math.floor(Math.random() * (totalCredits * 0.6));
    const remainingCredits = totalCredits - usedCredits;

    console.log(`Creating user ${i}: ${fullName} (${email})`);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: fullName,
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
        lastLoginAt: randomDate(createdAt, new Date()),

        // Create profile
        profile: {
          create: {
            businessName,
            industry,
            description,
            targetAudience: 'Small to medium businesses',
            location: 'United States',
            timezone: 'America/New_York',
            tonePreference: randomElement(['professional', 'casual', 'friendly', 'formal']),
            completeness: Math.floor(Math.random() * 40) + 60,
            createdAt,
            updatedAt: createdAt,
          },
        },

        // Create subscription
        subscription: {
          create: {
            tier,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            creditsTotal: totalCredits,
            creditsRemaining: remainingCredits,
            creditsRollover: 0,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            createdAt,
            updatedAt: createdAt,
          },
        },

        // Create workspace
        workspace: {
          create: {
            name: workspaceName,
            slug: workspaceSlug,
            description: `${description} Welcome to ${workspaceName}!`,
            isPublished: Math.random() > 0.3, // 70% chance of being published
            settings: JSON.stringify({
              primaryColor: randomElement(['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']),
              fontFamily: randomElement(['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins']),
            }),
            createdAt,
            updatedAt: createdAt,

            // Create pages
            pages: {
              create: [
                {
                  title: 'Home',
                  slug: 'home',
                  description: `Welcome to ${workspaceName}`,
                  status: 'PUBLISHED',
                  isHomePage: true,
                  htmlContent: `
                    <div class="min-h-screen">
                      <section class="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <div class="max-w-4xl mx-auto text-center">
                          <h1 class="text-5xl font-bold mb-6">${workspaceName}</h1>
                          <p class="text-xl mb-8">${description}</p>
                          <a href="/contact" class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100">Get Started</a>
                        </div>
                      </section>
                      <section class="py-16 px-4">
                        <div class="max-w-4xl mx-auto">
                          <h2 class="text-3xl font-bold text-center mb-12">Our Services</h2>
                          <div class="grid md:grid-cols-3 gap-8">
                            <div class="p-6 border rounded-lg">
                              <h3 class="text-xl font-semibold mb-2">Service 1</h3>
                              <p class="text-gray-600">High-quality service tailored to your needs.</p>
                            </div>
                            <div class="p-6 border rounded-lg">
                              <h3 class="text-xl font-semibold mb-2">Service 2</h3>
                              <p class="text-gray-600">Expert solutions for your business.</p>
                            </div>
                            <div class="p-6 border rounded-lg">
                              <h3 class="text-xl font-semibold mb-2">Service 3</h3>
                              <p class="text-gray-600">Innovative approaches to complex problems.</p>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  `,
                  seoTitle: `${workspaceName} - ${businessName}`,
                  seoKeywords: `${industry}, business, services`,
                  sortOrder: 0,
                  publishedAt: createdAt,
                  createdAt,
                  updatedAt: createdAt,
                },
                {
                  title: 'About Us',
                  slug: 'about',
                  description: `Learn more about ${workspaceName}`,
                  status: 'PUBLISHED',
                  isHomePage: false,
                  htmlContent: `
                    <div class="min-h-screen py-16 px-4">
                      <div class="max-w-4xl mx-auto">
                        <h1 class="text-4xl font-bold mb-8">About Us</h1>
                        <p class="text-lg text-gray-600 mb-6">${description}</p>
                        <p class="text-lg text-gray-600 mb-6">
                          At ${workspaceName}, we are passionate about delivering excellence in the ${industry} industry.
                          Our team of dedicated professionals works tirelessly to ensure your success.
                        </p>
                        <h2 class="text-2xl font-bold mt-12 mb-4">Our Mission</h2>
                        <p class="text-gray-600">
                          To provide innovative solutions that help our clients achieve their goals and grow their businesses.
                        </p>
                      </div>
                    </div>
                  `,
                  seoTitle: `About - ${workspaceName}`,
                  seoKeywords: `about, ${industry}, team`,
                  sortOrder: 1,
                  publishedAt: createdAt,
                  createdAt,
                  updatedAt: createdAt,
                },
                {
                  title: 'Contact',
                  slug: 'contact',
                  description: `Get in touch with ${workspaceName}`,
                  status: 'PUBLISHED',
                  isHomePage: false,
                  htmlContent: `
                    <div class="min-h-screen py-16 px-4">
                      <div class="max-w-2xl mx-auto">
                        <h1 class="text-4xl font-bold mb-8">Contact Us</h1>
                        <p class="text-lg text-gray-600 mb-8">We'd love to hear from you. Get in touch with us today!</p>
                        <form class="space-y-6">
                          <div>
                            <label class="block text-sm font-medium mb-2">Name</label>
                            <input type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Your name">
                          </div>
                          <div>
                            <label class="block text-sm font-medium mb-2">Email</label>
                            <input type="email" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="your@email.com">
                          </div>
                          <div>
                            <label class="block text-sm font-medium mb-2">Message</label>
                            <textarea rows="4" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Your message"></textarea>
                          </div>
                          <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">Send Message</button>
                        </form>
                      </div>
                    </div>
                  `,
                  seoTitle: `Contact - ${workspaceName}`,
                  seoKeywords: 'contact, get in touch, message',
                  sortOrder: 2,
                  publishedAt: createdAt,
                  createdAt,
                  updatedAt: createdAt,
                },
              ],
            },

            // Create menus
            menus: {
              create: [
                {
                  name: 'Main Navigation',
                  location: 'HEADER',
                  isActive: true,
                  items: JSON.stringify([
                    { label: 'Home', url: '/', order: 0 },
                    { label: 'About', url: '/about', order: 1 },
                    { label: 'Contact', url: '/contact', order: 2 },
                  ]),
                  createdAt,
                  updatedAt: createdAt,
                },
                {
                  name: 'Footer Menu',
                  location: 'FOOTER',
                  isActive: true,
                  items: JSON.stringify([
                    { label: 'Privacy Policy', url: '/privacy', order: 0 },
                    { label: 'Terms of Service', url: '/terms', order: 1 },
                  ]),
                  createdAt,
                  updatedAt: createdAt,
                },
              ],
            },
          },
        },
      },
      include: {
        profile: true,
        subscription: true,
        workspace: {
          include: {
            pages: true,
            menus: true,
          },
        },
      },
    });

    users.push(user);

    // Create payment history (1-5 payments per user)
    const numPayments = Math.floor(Math.random() * 5) + 1;
    const billingCycle = Math.random() > 0.3 ? 'MONTHLY' : 'YEARLY';
    const pricing = tierPricing[tier];
    const amount = billingCycle === 'MONTHLY' ? pricing.monthly : pricing.yearly;

    console.log(`  Creating ${numPayments} payment(s) for ${fullName}`);

    for (let p = 0; p < numPayments; p++) {
      const paymentDate = randomDate(new Date(createdAt), new Date());
      const status = randomElement(paymentStatuses);
      const isPaid = status === 'PAID';

      await prisma.payment.create({
        data: {
          userId: user.id,
          subscriptionId: user.subscription?.id,
          razorpayOrderId: generateRazorpayOrderId(),
          razorpayPaymentId: isPaid ? generateRazorpayPaymentId() : null,
          razorpaySignature: isPaid ? generateRazorpaySignature() : null,
          amount,
          currency: 'INR',
          status,
          planId: tier,
          metadata: JSON.stringify({
            billingCycle,
            email: email,
            name: fullName,
          }),
          failureReason: status === 'FAILED' ? randomElement([
            'Payment declined by bank',
            'Insufficient funds',
            'Card expired',
            'Network error',
            'Authentication failed',
          ]) : null,
          createdAt: paymentDate,
          updatedAt: paymentDate,
        },
      });
    }

    // Create credit transactions (3-10 transactions per user)
    const numTransactions = Math.floor(Math.random() * 8) + 3;
    let runningBalance = totalCredits;

    console.log(`  Creating ${numTransactions} credit transaction(s) for ${fullName}`);

    // First transaction: Subscription credit
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: 'SUBSCRIPTION',
        amount: totalCredits,
        balance: totalCredits,
        description: `${tier} plan subscription credits`,
        referenceId: user.subscription?.id,
        createdAt,
      },
    });

    // Additional transactions (usage, bonus, etc.)
    for (let t = 1; t < numTransactions; t++) {
      const transactionDate = randomDate(createdAt, new Date());
      const type = randomElement(['USAGE', 'USAGE', 'USAGE', 'BONUS']); // Weighted towards USAGE

      let transactionAmount: number;
      let description: string;

      if (type === 'USAGE') {
        transactionAmount = -Math.floor(Math.random() * 20) - 1; // -1 to -20 credits
        const contentTypes = ['Social Post', 'Blog Article', 'Email Campaign', 'Ad Copy', 'Landing Page'];
        description = `Generated ${randomElement(contentTypes)}`;
        runningBalance = Math.max(0, runningBalance + transactionAmount);
      } else if (type === 'BONUS') {
        transactionAmount = Math.floor(Math.random() * 50) + 10; // 10-60 bonus credits
        const bonusReasons = ['Referral bonus', 'Loyalty reward', 'Promotional credit', 'Beta tester bonus'];
        description = randomElement(bonusReasons);
        runningBalance += transactionAmount;
      } else {
        transactionAmount = Math.floor(Math.random() * 30) + 5;
        description = 'Credit adjustment';
        runningBalance += transactionAmount;
      }

      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type,
          amount: transactionAmount,
          balance: runningBalance,
          description,
          referenceId: type === 'USAGE' ? uuidv4() : null,
          createdAt: transactionDate,
        },
      });
    }
  }

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================\n');
  console.log('Created 15 users with:');
  console.log('- USER role');
  console.log('- Active subscriptions (STARTER/PROFESSIONAL/BUSINESS)');
  console.log('- Workspaces with 3 pages each (Home, About, Contact)');
  console.log('- Header and Footer menus');
  console.log('- Payment history (1-5 payments each)');
  console.log('- Credit transactions (3-10 transactions each)');
  console.log('\nTest credentials:');
  console.log('- Password for all users: password123');
  console.log('\nPricing tiers (INR):');
  console.log('- STARTER: ₹499/month or ₹4,990/year');
  console.log('- PROFESSIONAL: ₹1,499/month or ₹14,990/year');
  console.log('- BUSINESS: ₹3,999/month or ₹39,990/year');
  console.log('\nExample users:');
  users.slice(0, 3).forEach((user) => {
    console.log(`  - ${user.email} (${user.subscription?.tier})`);
    console.log(`    Workspace: ${user.workspace?.slug}.jeeper.app`);
  });
  console.log('  ...');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
