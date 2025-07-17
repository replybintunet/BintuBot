# BintuBot Streaming Platform

## Overview

BintuBot is a live streaming platform application that allows users to upload videos and stream them to viewers. The application features a React frontend with a modern UI built using shadcn/ui components, an Express.js backend with real-time WebSocket communication, and FFmpeg integration for video streaming capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack monorepo structure with clear separation between client and server code:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Real-time Communication**: WebSocket client for live updates

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time**: WebSocket server for live streaming updates
- **File Processing**: FFmpeg integration for video streaming
- **Session Management**: Express sessions with PostgreSQL storage

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Centralized schema definitions in shared directory
- **Migrations**: Drizzle Kit for database migrations

## Key Components

### Authentication System
- Simple account code-based authentication
- Session-based user management
- Frontend auth state management with localStorage persistence

### Streaming Infrastructure
- FFmpeg service for video processing and streaming
- File upload handling with multer
- Video format validation and file management
- Real-time stream status updates via WebSockets

### UI Components
- Comprehensive component library using shadcn/ui
- Responsive design with mobile-first approach
- Form handling with react-hook-form and Zod validation
- Toast notifications for user feedback

### Data Models
- **Users**: Basic user accounts with username/password
- **Streams**: Video stream configurations with quality settings
- **Stream Stats**: Real-time metrics including viewer count and uptime

## Data Flow

1. **Authentication**: Users login with account codes, sessions stored in PostgreSQL
2. **Stream Creation**: Users create streams and upload video files
3. **Video Processing**: FFmpeg processes uploaded videos for streaming
4. **Real-time Updates**: WebSocket broadcasts stream status and statistics
5. **Stream Management**: Users can start/stop streams and adjust settings

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **multer**: File upload handling
- **ws**: WebSocket implementation

### Development Tools
- **Vite**: Build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Type safety across the application
- **ESBuild**: Production build optimization

### Media Processing
- **FFmpeg**: Video processing and streaming (external dependency)

## Deployment Strategy

### Build Process
- Frontend builds to `dist/public` using Vite
- Backend bundles to `dist/index.js` using ESBuild
- Shared TypeScript code compiled for both environments

### Environment Configuration
- Database URL configuration via environment variables
- Production/development mode handling
- Replit-specific integration with development tools

### File Structure
- Monorepo structure with client, server, and shared directories
- Path aliases configured for clean imports
- Centralized configuration files at root level

### Runtime Requirements
- Node.js environment with ES module support
- PostgreSQL database (Neon serverless recommended)
- FFmpeg binary available in system PATH
- File system access for video uploads storage

The application is designed to be deployed on Replit with development-specific tooling and can be adapted for other hosting platforms with minimal configuration changes.