# UI Component Style Guide - GLY-VTU Security & Account Pages

This document provides comprehensive styling guidelines and component patterns used in the new security and account management pages.

## Table of Contents
1. [Design System](#design-system)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout Patterns](#layout-patterns)
5. [Component Types](#component-types)
6. [Interactive Elements](#interactive-elements)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)

---

## Design System

### Design Principles
- **Clean & Minimal**: Reduce cognitive load with simple, focused layouts
- **Security-First**: Visual cues for security status and sensitive actions
- **User-Focused**: Clear instructions and helpful guidance
- **Responsive**: Works seamlessly on mobile, tablet, and desktop
- **Accessible**: WCAG 2.1 AA compliance

### Grid System
- Uses Tailwind CSS responsive grid
- Base spacing unit: 4px (via `px-4`, `py-4`)
- Max width containers: `max-w-4xl`, `max-w-6xl` for pages
- Responsive breakpoints: `sm:`, `lg:` prefixes

---

## Color Palette

### Primary Colors
```
Blue-600: #2563eb - Primary action, security positive
Blue-700: #1d4ed8 - Hover state for blue buttons
Blue-50: #eff6ff - Light blue background
Blue-200: #bfdbfe - Light blue accent
```

### Semantic Colors
```
Green: Success, verified, secured
- Green-50: #f0fdf4 (background)
- Green-600: #16a34a (text/icon)
- Green-100: #dcfce7 (light accent)

Red: Danger, warning, error
- Red-50: #fef2f2 (background)
- Red-600: #dc2626 (text/icon)
- Red-200: #fecaca (light accent)

Yellow/Orange: Warning, caution
- Yellow-50: #fefce8 (background)
- Yellow-600: #ca8a04 (text/icon)
- Orange-50: #fff7ed (background)

Gray: Neutral, secondary
- Gray-50: #f9fafb (background)
- Gray-600: #4b5563 (secondary text)
- Gray-900: #111827 (primary text)
```

### Usage Examples
```jsx
// Success State
<div className="bg-green-50 border border-green-200 p-4 rounded-lg">
  <span className="text-green-800">Success message</span>
</div>

// Error State
<div className="bg-red-50 border border-red-200 p-4 rounded-lg">
  <AlertCircle className="text-red-600" />
  <span className="text-red-800">Error message</span>
</div>

// Security Status
<div className="bg-green-50 border-2 border-green-200">
  <p className="text-green-700">Secured</p>
  <CheckCircle className="text-green-600" />
</div>
```

---

## Typography

### Heading Hierarchy
```
h1 (Page Title)
text-3xl font-bold text-gray-900
Example: "Account Settings"

h2 (Section Title)
text-2xl font-bold text-gray-900
Example: "Change Password"

h3 (Subsection)
text-lg font-bold text-gray-900
Example: "Password Requirements"

h4 (Card Title)
text-lg font-semibold text-gray-900
Example: "Email Address"

Label (Form Labels)
text-sm font-medium text-gray-700 mb-3
Example: "Current Password"

Body Text
text-base text-gray-600 / text-gray-900
Example: Descriptions and helper text

Small/Helper
text-sm text-gray-500 / text-gray-600
Example: "Last updated: 2 hours ago"

Tiny/Meta
text-xs text-gray-500 / text-gray-600
Example: "Requires 12+ characters"
```

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## Layout Patterns

### Page Layout
```jsx
<div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
  {/* Header */}
  <div className="mb-8">
    <h1 className="text-3xl font-bold text-gray-900">Page Title</h1>
    <p className="text-gray-600 mt-1">Subtitle/description</p>
  </div>

  {/* Content Cards */}
  <div className="bg-white rounded-lg shadow-lg p-8">
    {/* Content */}
  </div>
</div>
```

### Card Layout
```jsx
<div className="bg-white rounded-lg shadow-lg p-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-6">
    Section Title
  </h2>
  {/* Card content */}
</div>
```

### Status Card Layout
```jsx
<div className="rounded-lg p-6 mb-8 bg-green-50 border-2 border-green-200">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      <div className="p-3 bg-green-200 rounded-lg">
        <Shield className="text-green-600" size={24} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Status Title</h3>
        <p className="text-sm text-green-700 mt-1">Status description</p>
      </div>
    </div>
    <CheckCircle className="text-green-600" size={28} />
  </div>
</div>
```

### Grid Layouts
```jsx
// 2-column grid (responsive)
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

// 3-column grid (responsive)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

// Info cards in grid
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
    <p className="text-sm text-gray-600">Label</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">Value</p>
  </div>
</div>
```

---

## Component Types

### Buttons

#### Primary Button (Action)
```jsx
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
  Button Text
</button>
```

#### Secondary Button (Alternative)
```jsx
<button className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-semibold">
  Button Text
</button>
```

#### Outline Button (Subtle)
```jsx
<button className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold">
  Button Text
</button>
```

#### Danger Button (Destructive)
```jsx
<button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
  Delete
</button>
```

#### Disabled Button
```jsx
<button disabled className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed">
  Disabled
</button>
```

#### Button with Icon
```jsx
<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  <Icon size={18} />
  Button Text
</button>
```

#### Loading Button
```jsx
<button disabled className="px-6 py-3 bg-blue-600 text-white rounded-lg">
  <div className="flex items-center gap-2">
    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
    Loading...
  </div>
</button>
```

### Form Elements

#### Text Input
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-3">
    Label
  </label>
  <input
    type="text"
    placeholder="Placeholder text"
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
  />
</div>
```

#### Input with Prefix/Suffix
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-3">Amount</label>
  <div className="relative">
    <span className="absolute left-4 top-3 text-gray-600 font-semibold">NGN</span>
    <input
      type="number"
      placeholder="0.00"
      className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg"
    />
  </div>
</div>
```

#### Select Dropdown
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-3">Select</label>
  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</div>
```

#### Checkbox
```jsx
<div className="flex items-center gap-2">
  <input type="checkbox" id="agree" className="w-4 h-4 rounded border-gray-300" />
  <label htmlFor="agree" className="text-sm text-gray-700">
    I agree to the terms
  </label>
</div>
```

#### Toggle Switch
```jsx
<button
  onClick={() => setEnabled(!enabled)}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
    enabled ? 'bg-blue-600' : 'bg-gray-300'
  }`}
>
  <span
    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
      enabled ? 'translate-x-6' : 'translate-x-1'
    }`}
  />
</button>
```

### Alert/Message Components

#### Error Alert
```jsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
  <span className="text-red-800">Error message text</span>
</div>
```

#### Success Alert
```jsx
<div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
  <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
  <span className="text-green-800">Success message text</span>
</div>
```

#### Warning Alert
```jsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-yellow-800 text-sm">Warning message</p>
</div>
```

#### Info Alert
```jsx
<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <p className="text-blue-800 text-sm">
    <strong>Note:</strong> Additional information
  </p>
</div>
```

### Badge Components

#### Status Badge
```jsx
<span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
  Active
</span>
```

#### Severity Badge
```jsx
<div className="px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
  HIGH
</div>
```

---

## Interactive Elements

### Tabs
```jsx
<div className="flex gap-2 border-b border-gray-200">
  {tabs.map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-3 font-semibold border-b-2 transition ${
        activeTab === tab
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {tab}
    </button>
  ))}
</div>
```

### Loading Spinner
```jsx
<div className="flex items-center justify-center py-12">
  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
</div>
```

### Accordion
```jsx
<div className="space-y-2">
  {items.map(item => (
    <div key={item.id} className="border border-gray-300 rounded-lg">
      <button
        onClick={() => setOpen(open === item.id ? null : item.id)}
        className="w-full px-4 py-3 text-left font-semibold text-gray-900 hover:bg-gray-50 flex justify-between items-center"
      >
        {item.title}
        <span className={`transform transition ${open === item.id ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open === item.id && (
        <div className="px-4 py-3 border-t bg-gray-50 text-gray-600">
          {item.content}
        </div>
      )}
    </div>
  ))}
</div>
```

---

## Responsive Design

### Breakpoints
```
No prefix: Mobile (< 640px)
sm:       Small devices (≥ 640px)
lg:       Large devices (≥ 1024px)
```

### Responsive Text Size
```jsx
// Example: Title responsive sizing
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Title</h1>

// Example: Padding responsive
<div className="px-4 sm:px-6 lg:px-8 py-6">Content</div>

// Example: Grid responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <div key={item.id}>{item}</div>)}
</div>

// Example: Display responsive
<div className="hidden sm:block">Shown on small screens and up</div>
```

### Mobile-First Approach
- Start with base styles (mobile)
- Add `sm:`, `lg:` prefixes for larger screens
- Never use `max-w-` constraints that shrink on larger screens
- Test on: 375px (mobile), 640px (tablet), 1024px (desktop)

---

## Accessibility

### Semantic HTML
- Use `<button>` for interactive elements, not `<div>`
- Use `<label>` for form inputs
- Use `<h1>`, `<h2>`, etc. for headings
- Use `<table>` for tabular data

### ARIA Labels
```jsx
// For icon-only buttons
<button aria-label="Toggle password visibility">
  <Eye size={20} />
</button>

// For custom components
<div role="alert" aria-live="polite">
  Error message
</div>

// For expandable sections
<button aria-expanded={isOpen}>Expand</button>
```

### Color Contrast
- Text on background: 4.5:1 ratio (AA minimum)
- Large text (≥18pt): 3:1 ratio
- Interactive elements: minimum 44×44px touch target

### Focus States
```jsx
// Always include focus states
<button className="... focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Button
</button>
```

### Keyboard Navigation
- Tab through all interactive elements in logical order
- Enter/Space to activate buttons
- Arrow keys for lists/tabs
- Escape to close modals

---

## Component Checklist

When creating new pages, ensure:

- ✅ Color palette usage is consistent
- ✅ Typography hierarchy is clear
- ✅ Spacing follows 4px grid system
- ✅ All buttons have hover states
- ✅ Form inputs have focus states
- ✅ Error messages are clear and actionable
- ✅ Loading states are visible
- ✅ Mobile responsive (tested at 375px)
- ✅ Touch targets are ≥44×44px
- ✅ Color contrast ratio ≥4.5:1
- ✅ Icons are from lucide-react
- ✅ ARIA labels where needed
- ✅ Keyboard navigation works
- ✅ Semantic HTML used throughout

---

## Implementation Example

Complete example of a form with all best practices:

```jsx
import { useState } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export function ExampleForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API call
      setSuccess('Form submitted successfully!');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Form Title</h1>
        <p className="text-gray-600 mt-1">Subtitle</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-3">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## References

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [lucide-react Icons](https://lucide.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
