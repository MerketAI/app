'use client';

import { useEffect, useState } from 'react';
import { plansApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Zap,
  IndianRupee,
  Percent,
  CreditCard,
  Loader2,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount: number;
  credits: number;
  features: string[];
  razorpayMonthlyPlanId: string | null;
  razorpayYearlyPlanId: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  monthlyPriceDisplay: number;
  yearlyPriceDisplay: number;
  createdAt: string;
  updatedAt: string;
}

const emptyFormData = {
  name: '',
  displayName: '',
  description: '',
  monthlyPrice: 0,
  yearlyPrice: 0,
  yearlyDiscount: 0,
  credits: 0,
  features: [] as string[],
  isActive: true,
  isDefault: false,
  sortOrder: 0,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [featureInput, setFeatureInput] = useState('');
  const [creatingRazorpayPlan, setCreatingRazorpayPlan] = useState<{
    planId: string;
    cycle: 'MONTHLY' | 'YEARLY';
  } | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const response = await plansApi.getAll();
      setPlans(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedPlans = async () => {
    try {
      await plansApi.seed();
      loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to seed plans');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await plansApi.create({
        ...formData,
        monthlyPrice: Math.round(formData.monthlyPrice * 100), // Convert to paise
        yearlyPrice: Math.round(formData.yearlyPrice * 100),
      });
      setFormData(emptyFormData);
      setIsAdding(false);
      loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create plan');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      await plansApi.update(editingPlan.id, {
        displayName: formData.displayName,
        description: formData.description || undefined,
        monthlyPrice: Math.round(formData.monthlyPrice * 100),
        yearlyPrice: Math.round(formData.yearlyPrice * 100),
        yearlyDiscount: formData.yearlyDiscount,
        credits: formData.credits,
        features: formData.features,
        isActive: formData.isActive,
        isDefault: formData.isDefault,
        sortOrder: formData.sortOrder,
      });
      setEditingPlan(null);
      setFormData(emptyFormData);
      loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update plan');
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to delete the "${plan.displayName}" plan?`)) {
      return;
    }
    try {
      await plansApi.delete(plan.id);
      loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete plan');
    }
  };

  const handleCreateRazorpayPlan = async (planId: string, billingCycle: 'MONTHLY' | 'YEARLY') => {
    setCreatingRazorpayPlan({ planId, cycle: billingCycle });
    try {
      const response = await plansApi.createRazorpayPlan(planId, billingCycle);
      alert(response.data.message);
      loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create Razorpay plan');
    } finally {
      setCreatingRazorpayPlan(null);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const startEditing = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPriceDisplay,
      yearlyPrice: plan.yearlyPriceDisplay,
      yearlyDiscount: plan.yearlyDiscount,
      credits: plan.credits,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
    });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setIsAdding(false);
    setFormData(emptyFormData);
    setFeatureInput('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Manage subscription plans with monthly/yearly pricing
          </p>
        </div>
        <div className="flex gap-2">
          {plans.length === 0 && (
            <Button variant="outline" onClick={handleSeedPlans}>
              <Zap className="mr-2 h-4 w-4" />
              Seed Default Plans
            </Button>
          )}
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingPlan) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingPlan ? `Edit Plan: ${editingPlan.displayName}` : 'Create New Plan'}
            </CardTitle>
            <CardDescription>
              {editingPlan
                ? 'Update the plan details below'
                : 'Fill in the details for the new subscription plan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingPlan ? handleUpdate : handleCreate} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {!editingPlan && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Plan Name (Internal)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., PROFESSIONAL"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier, uppercase (e.g., STARTER, PROFESSIONAL)
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    placeholder="e.g., Professional Plan"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g., Best for growing businesses"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Pricing (in INR)
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyPrice">Monthly Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        Rs
                      </span>
                      <Input
                        id="monthlyPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthlyPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearlyPrice">Yearly Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        Rs
                      </span>
                      <Input
                        id="yearlyPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.yearlyPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, yearlyPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearlyDiscount">Yearly Discount %</Label>
                    <div className="relative">
                      <Input
                        id="yearlyDiscount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.yearlyDiscount}
                        onChange={(e) =>
                          setFormData({ ...formData, yearlyDiscount: parseInt(e.target.value) || 0 })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Percent className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits Section */}
              <div className="space-y-2">
                <Label htmlFor="credits">Credits per Billing Cycle</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0"
                  value={formData.credits}
                  onChange={(e) =>
                    setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              {/* Features Section */}
              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button type="button" onClick={addFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isDefault: checked })
                    }
                  />
                  <Label htmlFor="isDefault">Default Plan</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingPlan ? 'Update Plan' : 'Create Plan'}</Button>
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${!plan.isActive ? 'opacity-60' : ''} ${
              plan.isDefault ? 'border-primary' : ''
            }`}
          >
            {plan.isDefault && (
              <Badge className="absolute -top-2 -right-2">Default</Badge>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {plan.displayName}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(plan)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(plan)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {plan.description}
                {!plan.isActive && (
                  <Badge variant="secondary" className="ml-2">
                    Inactive
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing Display */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    Rs {plan.monthlyPriceDisplay.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Rs {plan.yearlyPriceDisplay.toLocaleString()}/year
                  {plan.yearlyDiscount > 0 && (
                    <Badge variant="outline" className="ml-2">
                      Save {plan.yearlyDiscount}%
                    </Badge>
                  )}
                </div>
              </div>

              {/* Credits */}
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{plan.credits.toLocaleString()} credits/cycle</span>
              </div>

              {/* Features */}
              {plan.features.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs">+{plan.features.length - 4} more...</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Razorpay Integration */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Razorpay Subscription
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Monthly:</span>
                    {plan.razorpayMonthlyPlanId ? (
                      <Badge variant="outline" className="ml-1 text-green-600">
                        Configured
                      </Badge>
                    ) : plan.monthlyPrice > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-1 h-6 text-xs"
                        onClick={() => handleCreateRazorpayPlan(plan.id, 'MONTHLY')}
                        disabled={creatingRazorpayPlan?.planId === plan.id}
                      >
                        {creatingRazorpayPlan?.planId === plan.id &&
                        creatingRazorpayPlan?.cycle === 'MONTHLY' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Setup'
                        )}
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="ml-1">
                        Free
                      </Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Yearly:</span>
                    {plan.razorpayYearlyPlanId ? (
                      <Badge variant="outline" className="ml-1 text-green-600">
                        Configured
                      </Badge>
                    ) : plan.yearlyPrice > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-1 h-6 text-xs"
                        onClick={() => handleCreateRazorpayPlan(plan.id, 'YEARLY')}
                        disabled={creatingRazorpayPlan?.planId === plan.id}
                      >
                        {creatingRazorpayPlan?.planId === plan.id &&
                        creatingRazorpayPlan?.cycle === 'YEARLY' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Setup'
                        )}
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="ml-1">
                        Free
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Internal ID */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <span className="font-mono">{plan.name}</span> | Order: {plan.sortOrder}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No plans configured</h3>
            <p className="text-muted-foreground mb-4">
              Get started by seeding default plans or creating a new one
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSeedPlans}>
                <Zap className="mr-2 h-4 w-4" />
                Seed Default Plans
              </Button>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Custom Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
