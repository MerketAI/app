import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateBusinessProfileDto,
  CreateProductDto,
  UpdateProductDto,
  CreateServiceDto,
  UpdateServiceDto,
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CreateTargetAudienceDto,
  UpdateTargetAudienceDto,
} from './dto/business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  // Helper to generate slug
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Helper to parse JSON fields
  private parseJsonField(value: string | null, defaultValue: any = []): any {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  // ============================================
  // Business Profile
  // ============================================

  async getBusinessProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        businessProducts: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        businessServices: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        businessCompetitors: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        targetAudiences: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!profile) {
      // Create profile if doesn't exist
      return this.prisma.userProfile.create({
        data: { userId },
        include: {
          businessProducts: true,
          businessServices: true,
          businessCompetitors: true,
          targetAudiences: true,
        },
      });
    }

    // Parse JSON fields
    return {
      ...profile,
      socialLinks: this.parseJsonField(profile.socialLinks, {}),
      brandColors: this.parseJsonField(profile.brandColors, {}),
      brandKeywords: this.parseJsonField(profile.brandKeywords, []),
      uniqueSellingPoints: this.parseJsonField(profile.uniqueSellingPoints, []),
      services: this.parseJsonField(profile.services, []),
      products: this.parseJsonField(profile.products, []),
      competitors: this.parseJsonField(profile.competitors, []),
      // Brand fields
      toneAttributes: this.parseJsonField(profile.toneAttributes, []),
      personalityTraits: this.parseJsonField(profile.personalityTraits, []),
      keyMessages: this.parseJsonField(profile.keyMessages, []),
      contentThemes: this.parseJsonField(profile.contentThemes, []),
      topicsToAvoid: this.parseJsonField(profile.topicsToAvoid, []),
      brandDos: this.parseJsonField(profile.brandDos, []),
      brandDonts: this.parseJsonField(profile.brandDonts, []),
      phraseExamples: this.parseJsonField(profile.phraseExamples, []),
    };
  }

  async updateBusinessProfile(userId: string, dto: UpdateBusinessProfileDto) {
    const data: any = { ...dto };

    // Stringify JSON fields - basic
    if (dto.socialLinks) data.socialLinks = JSON.stringify(dto.socialLinks);
    if (dto.brandColors) data.brandColors = JSON.stringify(dto.brandColors);
    if (dto.brandKeywords) data.brandKeywords = JSON.stringify(dto.brandKeywords);
    if (dto.uniqueSellingPoints) data.uniqueSellingPoints = JSON.stringify(dto.uniqueSellingPoints);

    // Stringify JSON fields - brand
    if (dto.toneAttributes) data.toneAttributes = JSON.stringify(dto.toneAttributes);
    if (dto.personalityTraits) data.personalityTraits = JSON.stringify(dto.personalityTraits);
    if (dto.keyMessages) data.keyMessages = JSON.stringify(dto.keyMessages);
    if (dto.contentThemes) data.contentThemes = JSON.stringify(dto.contentThemes);
    if (dto.topicsToAvoid) data.topicsToAvoid = JSON.stringify(dto.topicsToAvoid);
    if (dto.brandDos) data.brandDos = JSON.stringify(dto.brandDos);
    if (dto.brandDonts) data.brandDonts = JSON.stringify(dto.brandDonts);
    if (dto.phraseExamples) data.phraseExamples = JSON.stringify(dto.phraseExamples);

    // Calculate completeness
    const completeness = this.calculateProfileCompleteness(dto);
    data.completeness = completeness;

    return this.prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  private calculateProfileCompleteness(dto: UpdateBusinessProfileDto): number {
    const fields = [
      dto.businessName,
      dto.industry,
      dto.description,
      dto.mission,
      dto.businessModel,
      dto.website,
      dto.valueProposition,
      dto.uniqueSellingPoints?.length,
      dto.brandVoice,
      dto.tonePreference,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }

  // ============================================
  // Products
  // ============================================

  async getProducts(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const products = await this.prisma.businessProduct.findMany({
      where: { profileId: profile.id },
      orderBy: { sortOrder: 'asc' },
    });

    return products.map((p) => ({
      ...p,
      features: this.parseJsonField(p.features, []),
      benefits: this.parseJsonField(p.benefits, []),
      specifications: this.parseJsonField(p.specifications, {}),
      images: this.parseJsonField(p.images, []),
      useCases: this.parseJsonField(p.useCases, []),
      competitors: this.parseJsonField(p.competitors, []),
      differentiators: this.parseJsonField(p.differentiators, []),
      keywords: this.parseJsonField(p.keywords, []),
      hashtags: this.parseJsonField(p.hashtags, []),
    }));
  }

  async getProduct(userId: string, productId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const product = await this.prisma.businessProduct.findFirst({
      where: { id: productId, profileId: profile.id },
    });

    if (!product) throw new NotFoundException('Product not found');

    return {
      ...product,
      features: this.parseJsonField(product.features, []),
      benefits: this.parseJsonField(product.benefits, []),
      specifications: this.parseJsonField(product.specifications, {}),
      images: this.parseJsonField(product.images, []),
      useCases: this.parseJsonField(product.useCases, []),
      competitors: this.parseJsonField(product.competitors, []),
      differentiators: this.parseJsonField(product.differentiators, []),
      keywords: this.parseJsonField(product.keywords, []),
      hashtags: this.parseJsonField(product.hashtags, []),
    };
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const profile = await this.getOrCreateProfile(userId);
    const slug = dto.slug || this.generateSlug(dto.name);

    const data: any = {
      profileId: profile.id,
      name: dto.name,
      slug,
      description: dto.description,
      shortDescription: dto.shortDescription,
      category: dto.category,
      subCategory: dto.subCategory,
      priceType: dto.priceType || 'FIXED',
      price: dto.price,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      currency: dto.currency || 'USD',
      pricingModel: dto.pricingModel,
      targetMarket: dto.targetMarket,
      idealCustomer: dto.idealCustomer,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
    };

    // Stringify arrays
    if (dto.features) data.features = JSON.stringify(dto.features);
    if (dto.benefits) data.benefits = JSON.stringify(dto.benefits);
    if (dto.specifications) data.specifications = JSON.stringify(dto.specifications);
    if (dto.images) data.images = JSON.stringify(dto.images);
    if (dto.useCases) data.useCases = JSON.stringify(dto.useCases);
    if (dto.competitors) data.competitors = JSON.stringify(dto.competitors);
    if (dto.differentiators) data.differentiators = JSON.stringify(dto.differentiators);
    if (dto.keywords) data.keywords = JSON.stringify(dto.keywords);
    if (dto.hashtags) data.hashtags = JSON.stringify(dto.hashtags);

    return this.prisma.businessProduct.create({ data });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.businessProduct.findFirst({
      where: { id: productId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Product not found');

    const data: any = { ...dto };

    // Stringify arrays
    if (dto.features) data.features = JSON.stringify(dto.features);
    if (dto.benefits) data.benefits = JSON.stringify(dto.benefits);
    if (dto.specifications) data.specifications = JSON.stringify(dto.specifications);
    if (dto.images) data.images = JSON.stringify(dto.images);
    if (dto.useCases) data.useCases = JSON.stringify(dto.useCases);
    if (dto.competitors) data.competitors = JSON.stringify(dto.competitors);
    if (dto.differentiators) data.differentiators = JSON.stringify(dto.differentiators);
    if (dto.keywords) data.keywords = JSON.stringify(dto.keywords);
    if (dto.hashtags) data.hashtags = JSON.stringify(dto.hashtags);

    return this.prisma.businessProduct.update({
      where: { id: productId },
      data,
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.businessProduct.findFirst({
      where: { id: productId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.businessProduct.delete({ where: { id: productId } });
    return { message: 'Product deleted successfully' };
  }

  // ============================================
  // Services
  // ============================================

  async getServices(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const services = await this.prisma.businessService.findMany({
      where: { profileId: profile.id },
      orderBy: { sortOrder: 'asc' },
    });

    return services.map((s) => ({
      ...s,
      deliverables: this.parseJsonField(s.deliverables, []),
      process: this.parseJsonField(s.process, []),
      requirements: this.parseJsonField(s.requirements, []),
      benefits: this.parseJsonField(s.benefits, []),
      industries: this.parseJsonField(s.industries, []),
      competitors: this.parseJsonField(s.competitors, []),
      differentiators: this.parseJsonField(s.differentiators, []),
      keywords: this.parseJsonField(s.keywords, []),
      hashtags: this.parseJsonField(s.hashtags, []),
    }));
  }

  async getService(userId: string, serviceId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId, profileId: profile.id },
    });

    if (!service) throw new NotFoundException('Service not found');

    return {
      ...service,
      deliverables: this.parseJsonField(service.deliverables, []),
      process: this.parseJsonField(service.process, []),
      requirements: this.parseJsonField(service.requirements, []),
      benefits: this.parseJsonField(service.benefits, []),
      industries: this.parseJsonField(service.industries, []),
      competitors: this.parseJsonField(service.competitors, []),
      differentiators: this.parseJsonField(service.differentiators, []),
      keywords: this.parseJsonField(service.keywords, []),
      hashtags: this.parseJsonField(service.hashtags, []),
    };
  }

  async createService(userId: string, dto: CreateServiceDto) {
    const profile = await this.getOrCreateProfile(userId);
    const slug = dto.slug || this.generateSlug(dto.name);

    const data: any = {
      profileId: profile.id,
      name: dto.name,
      slug,
      description: dto.description,
      shortDescription: dto.shortDescription,
      category: dto.category,
      priceType: dto.priceType || 'CUSTOM',
      price: dto.price,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      currency: dto.currency || 'USD',
      pricingUnit: dto.pricingUnit,
      billingFrequency: dto.billingFrequency,
      duration: dto.duration,
      targetMarket: dto.targetMarket,
      idealClient: dto.idealClient,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
    };

    // Stringify arrays
    if (dto.deliverables) data.deliverables = JSON.stringify(dto.deliverables);
    if (dto.process) data.process = JSON.stringify(dto.process);
    if (dto.requirements) data.requirements = JSON.stringify(dto.requirements);
    if (dto.benefits) data.benefits = JSON.stringify(dto.benefits);
    if (dto.industries) data.industries = JSON.stringify(dto.industries);
    if (dto.competitors) data.competitors = JSON.stringify(dto.competitors);
    if (dto.differentiators) data.differentiators = JSON.stringify(dto.differentiators);
    if (dto.keywords) data.keywords = JSON.stringify(dto.keywords);
    if (dto.hashtags) data.hashtags = JSON.stringify(dto.hashtags);

    return this.prisma.businessService.create({ data });
  }

  async updateService(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.businessService.findFirst({
      where: { id: serviceId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Service not found');

    const data: any = { ...dto };

    // Stringify arrays
    if (dto.deliverables) data.deliverables = JSON.stringify(dto.deliverables);
    if (dto.process) data.process = JSON.stringify(dto.process);
    if (dto.requirements) data.requirements = JSON.stringify(dto.requirements);
    if (dto.benefits) data.benefits = JSON.stringify(dto.benefits);
    if (dto.industries) data.industries = JSON.stringify(dto.industries);
    if (dto.competitors) data.competitors = JSON.stringify(dto.competitors);
    if (dto.differentiators) data.differentiators = JSON.stringify(dto.differentiators);
    if (dto.keywords) data.keywords = JSON.stringify(dto.keywords);
    if (dto.hashtags) data.hashtags = JSON.stringify(dto.hashtags);

    return this.prisma.businessService.update({
      where: { id: serviceId },
      data,
    });
  }

  async deleteService(userId: string, serviceId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.businessService.findFirst({
      where: { id: serviceId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Service not found');

    await this.prisma.businessService.delete({ where: { id: serviceId } });
    return { message: 'Service deleted successfully' };
  }

  // ============================================
  // Competitors
  // ============================================

  async getCompetitors(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const competitors = await this.prisma.businessCompetitor.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    return competitors.map((c) => ({
      ...c,
      strengths: this.parseJsonField(c.strengths, []),
      weaknesses: this.parseJsonField(c.weaknesses, []),
      opportunities: this.parseJsonField(c.opportunities, []),
      threats: this.parseJsonField(c.threats, []),
      products: this.parseJsonField(c.products, []),
      services: this.parseJsonField(c.services, []),
      uniqueFeatures: this.parseJsonField(c.uniqueFeatures, []),
      adPlatforms: this.parseJsonField(c.adPlatforms, []),
      adStrategies: this.parseJsonField(c.adStrategies, []),
      contentTypes: this.parseJsonField(c.contentTypes, []),
      socialFollowers: this.parseJsonField(c.socialFollowers, {}),
    }));
  }

  async getCompetitor(userId: string, competitorId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const competitor = await this.prisma.businessCompetitor.findFirst({
      where: { id: competitorId, profileId: profile.id },
    });

    if (!competitor) throw new NotFoundException('Competitor not found');

    return {
      ...competitor,
      strengths: this.parseJsonField(competitor.strengths, []),
      weaknesses: this.parseJsonField(competitor.weaknesses, []),
      opportunities: this.parseJsonField(competitor.opportunities, []),
      threats: this.parseJsonField(competitor.threats, []),
      products: this.parseJsonField(competitor.products, []),
      services: this.parseJsonField(competitor.services, []),
      uniqueFeatures: this.parseJsonField(competitor.uniqueFeatures, []),
      adPlatforms: this.parseJsonField(competitor.adPlatforms, []),
      adStrategies: this.parseJsonField(competitor.adStrategies, []),
      contentTypes: this.parseJsonField(competitor.contentTypes, []),
      socialFollowers: this.parseJsonField(competitor.socialFollowers, {}),
    };
  }

  async createCompetitor(userId: string, dto: CreateCompetitorDto) {
    const profile = await this.getOrCreateProfile(userId);

    const data: any = {
      profileId: profile.id,
      name: dto.name,
      website: dto.website,
      description: dto.description,
      industry: dto.industry,
      size: dto.size,
      founded: dto.founded,
      headquarters: dto.headquarters,
      facebookUrl: dto.facebookUrl,
      instagramUrl: dto.instagramUrl,
      twitterUrl: dto.twitterUrl,
      linkedinUrl: dto.linkedinUrl,
      youtubeUrl: dto.youtubeUrl,
      tiktokUrl: dto.tiktokUrl,
      marketPosition: dto.marketPosition,
      marketShare: dto.marketShare,
      pricePosition: dto.pricePosition,
      targetAudience: dto.targetAudience,
      pricingStrategy: dto.pricingStrategy,
      contentStrategy: dto.contentStrategy,
      adBudgetEstimate: dto.adBudgetEstimate,
      topPerformingAds: dto.topPerformingAds,
      postingFrequency: dto.postingFrequency,
      engagementLevel: dto.engagementLevel,
      engagementRate: dto.engagementRate,
      threatLevel: dto.threatLevel || 'MEDIUM',
      notes: dto.notes,
      isActive: dto.isActive ?? true,
    };

    // Stringify arrays
    if (dto.strengths) data.strengths = JSON.stringify(dto.strengths);
    if (dto.weaknesses) data.weaknesses = JSON.stringify(dto.weaknesses);
    if (dto.opportunities) data.opportunities = JSON.stringify(dto.opportunities);
    if (dto.threats) data.threats = JSON.stringify(dto.threats);
    if (dto.products) data.products = JSON.stringify(dto.products);
    if (dto.services) data.services = JSON.stringify(dto.services);
    if (dto.uniqueFeatures) data.uniqueFeatures = JSON.stringify(dto.uniqueFeatures);
    if (dto.adPlatforms) data.adPlatforms = JSON.stringify(dto.adPlatforms);
    if (dto.adStrategies) data.adStrategies = JSON.stringify(dto.adStrategies);
    if (dto.contentTypes) data.contentTypes = JSON.stringify(dto.contentTypes);
    if (dto.socialFollowers) data.socialFollowers = JSON.stringify(dto.socialFollowers);

    return this.prisma.businessCompetitor.create({ data });
  }

  async updateCompetitor(userId: string, competitorId: string, dto: UpdateCompetitorDto) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.businessCompetitor.findFirst({
      where: { id: competitorId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Competitor not found');

    const data: any = { ...dto };

    // Stringify arrays
    if (dto.strengths) data.strengths = JSON.stringify(dto.strengths);
    if (dto.weaknesses) data.weaknesses = JSON.stringify(dto.weaknesses);
    if (dto.opportunities) data.opportunities = JSON.stringify(dto.opportunities);
    if (dto.threats) data.threats = JSON.stringify(dto.threats);
    if (dto.products) data.products = JSON.stringify(dto.products);
    if (dto.services) data.services = JSON.stringify(dto.services);
    if (dto.uniqueFeatures) data.uniqueFeatures = JSON.stringify(dto.uniqueFeatures);
    if (dto.adPlatforms) data.adPlatforms = JSON.stringify(dto.adPlatforms);
    if (dto.adStrategies) data.adStrategies = JSON.stringify(dto.adStrategies);
    if (dto.contentTypes) data.contentTypes = JSON.stringify(dto.contentTypes);
    if (dto.socialFollowers) data.socialFollowers = JSON.stringify(dto.socialFollowers);

    return this.prisma.businessCompetitor.update({
      where: { id: competitorId },
      data,
    });
  }

  async deleteCompetitor(userId: string, competitorId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.businessCompetitor.findFirst({
      where: { id: competitorId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Competitor not found');

    await this.prisma.businessCompetitor.delete({ where: { id: competitorId } });
    return { message: 'Competitor deleted successfully' };
  }

  // ============================================
  // Target Audiences
  // ============================================

  async getTargetAudiences(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const audiences = await this.prisma.targetAudience.findMany({
      where: { profileId: profile.id },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });

    return audiences.map((a) => this.parseAudienceFields(a));
  }

  async getTargetAudience(userId: string, audienceId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const audience = await this.prisma.targetAudience.findFirst({
      where: { id: audienceId, profileId: profile.id },
    });

    if (!audience) throw new NotFoundException('Target audience not found');

    return this.parseAudienceFields(audience);
  }

  async createTargetAudience(userId: string, dto: CreateTargetAudienceDto) {
    const profile = await this.getOrCreateProfile(userId);

    // If setting as primary, unset other primaries
    if (dto.isPrimary) {
      await this.prisma.targetAudience.updateMany({
        where: { profileId: profile.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const data = this.buildAudienceData(profile.id, dto);
    return this.prisma.targetAudience.create({ data });
  }

  async updateTargetAudience(userId: string, audienceId: string, dto: UpdateTargetAudienceDto) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.targetAudience.findFirst({
      where: { id: audienceId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Target audience not found');

    // If setting as primary, unset other primaries
    if (dto.isPrimary) {
      await this.prisma.targetAudience.updateMany({
        where: { profileId: profile.id, isPrimary: true, id: { not: audienceId } },
        data: { isPrimary: false },
      });
    }

    const data: any = { ...dto };

    // Stringify arrays
    const arrayFields = [
      'jobTitles', 'industries', 'locations', 'languages', 'interests',
      'hobbies', 'values', 'decisionFactors', 'preferredChannels', 'deviceUsage',
      'painPoints', 'goals', 'challenges', 'motivations', 'objections', 'contentPreferences',
      'contentFormats', 'socialPlatforms', 'keyMessages', 'avoidTopics'
    ];

    arrayFields.forEach(field => {
      if (dto[field as keyof UpdateTargetAudienceDto]) {
        data[field] = JSON.stringify(dto[field as keyof UpdateTargetAudienceDto]);
      }
    });

    if (dto.bestPostingTimes) data.bestPostingTimes = JSON.stringify(dto.bestPostingTimes);

    return this.prisma.targetAudience.update({
      where: { id: audienceId },
      data,
    });
  }

  async deleteTargetAudience(userId: string, audienceId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.targetAudience.findFirst({
      where: { id: audienceId, profileId: profile.id },
    });

    if (!existing) throw new NotFoundException('Target audience not found');

    await this.prisma.targetAudience.delete({ where: { id: audienceId } });
    return { message: 'Target audience deleted successfully' };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.userProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  private parseAudienceFields(audience: any) {
    return {
      ...audience,
      jobTitles: this.parseJsonField(audience.jobTitles, []),
      industries: this.parseJsonField(audience.industries, []),
      locations: this.parseJsonField(audience.locations, []),
      languages: this.parseJsonField(audience.languages, []),
      interests: this.parseJsonField(audience.interests, []),
      hobbies: this.parseJsonField(audience.hobbies, []),
      values: this.parseJsonField(audience.values, []),
      decisionFactors: this.parseJsonField(audience.decisionFactors, []),
      preferredChannels: this.parseJsonField(audience.preferredChannels, []),
      deviceUsage: this.parseJsonField(audience.deviceUsage, []),
      painPoints: this.parseJsonField(audience.painPoints, []),
      goals: this.parseJsonField(audience.goals, []),
      challenges: this.parseJsonField(audience.challenges, []),
      motivations: this.parseJsonField(audience.motivations, []),
      objections: this.parseJsonField(audience.objections, []),
      contentPreferences: this.parseJsonField(audience.contentPreferences, []),
      contentFormats: this.parseJsonField(audience.contentFormats, []),
      socialPlatforms: this.parseJsonField(audience.socialPlatforms, []),
      bestPostingTimes: this.parseJsonField(audience.bestPostingTimes, {}),
      keyMessages: this.parseJsonField(audience.keyMessages, []),
      avoidTopics: this.parseJsonField(audience.avoidTopics, []),
    };
  }

  private buildAudienceData(profileId: string, dto: CreateTargetAudienceDto) {
    const data: any = {
      profileId,
      name: dto.name,
      description: dto.description,
      isPrimary: dto.isPrimary ?? false,
      ageMin: dto.ageMin,
      ageMax: dto.ageMax,
      gender: dto.gender,
      incomeLevel: dto.incomeLevel,
      educationLevel: dto.educationLevel,
      occupation: dto.occupation,
      location: dto.location,
      companySize: dto.companySize,
      lifestyle: dto.lifestyle,
      personality: dto.personality,
      buyingBehavior: dto.buyingBehavior,
      buyingFrequency: dto.buyingFrequency,
      avgOrderValue: dto.avgOrderValue,
      purchaseFrequency: dto.purchaseFrequency,
      communicationStyle: dto.communicationStyle,
      messagingTone: dto.messagingTone,
      notes: dto.notes,
      isActive: dto.isActive ?? true,
    };

    // Stringify arrays
    const arrayFields = [
      'jobTitles', 'industries', 'locations', 'languages', 'interests',
      'hobbies', 'values', 'decisionFactors', 'preferredChannels', 'deviceUsage',
      'painPoints', 'goals', 'challenges', 'motivations', 'objections', 'contentPreferences',
      'contentFormats', 'socialPlatforms', 'keyMessages', 'avoidTopics'
    ];

    arrayFields.forEach(field => {
      if (dto[field as keyof CreateTargetAudienceDto]) {
        data[field] = JSON.stringify(dto[field as keyof CreateTargetAudienceDto]);
      }
    });

    if (dto.bestPostingTimes) data.bestPostingTimes = JSON.stringify(dto.bestPostingTimes);

    return data;
  }
}
