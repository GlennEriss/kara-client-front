import { getAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { adminApp } from './admin';

export const adminAuth = getAuth(adminApp as App);
