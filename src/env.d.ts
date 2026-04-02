/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      role: 'ADMIN' | 'CUSTOMER' | 'TAILOR';
      name: string;
    };
  }
}
