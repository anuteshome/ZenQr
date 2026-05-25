# Requirements Document

## Introduction

The Restaurant QR Code Ordering & Management System is a responsive web application that enables contactless ordering for restaurant customers through QR codes. The system consists of three main interfaces: a customer-facing digital menu accessible via QR code scanning, a kitchen display screen for order management, and an administrative panel for restaurant operations. The system supports bilingual operation (English and Amharic) and uses React for the frontend with Supabase as the backend infrastructure.

## Glossary

- **Customer_App**: The web interface accessed by restaurant customers via QR code scanning
- **Kitchen_Display**: The dedicated screen interface used by kitchen staff to view and manage orders
- **Admin_Panel**: The administrative web interface for managing menus, employees, and inventory
- **QR_Code_Generator**: The component responsible for generating unique QR codes for each table
- **Order_Manager**: The backend service that handles order creation, updates, and status tracking
- **Menu_Service**: The backend service that manages menu items, categories, and pricing
- **Notification_Service**: The service that sends real-time notifications to administrators
- **Authentication_Service**: The service that handles user authentication and authorization
- **Inventory_Service**: The service that tracks ingredient stock levels
- **Employee_Service**: The service that manages employee records, roles, and shifts
- **Database**: The Supabase PostgreSQL database storing all system data
- **Real_Time_Subscription**: The Supabase real-time feature for live data updates
- **Table**: A physical dining table in the restaurant identified by a unique table number
- **Order_Status**: The current state of an order (Placed, Preparing, Ready, Served)
- **Menu_Item**: A food or beverage item available for ordering
- **Category**: A grouping of related menu items
- **Language_Preference**: The selected display language (English or Amharic)

## Requirements

### Requirement 1: QR Code Table Identification

**User Story:** As a restaurant customer, I want to scan a QR code at my table, so that the system automatically identifies my table number without manual entry.

#### Acceptance Criteria

1. THE QR_Code_Generator SHALL generate a unique QR code for each table number
2. WHEN a customer scans a QR code, THE Customer_App SHALL extract the table number from the QR code
3. WHEN a customer scans a QR code, THE Customer_App SHALL display the digital menu with the table number visible
4. THE QR_Code_Generator SHALL encode the table number in a URL format that opens the Customer_App
5. FOR ALL valid table numbers, encoding then decoding the QR code SHALL produce the same table number (round-trip property)

### Requirement 2: Digital Menu Browsing

**User Story:** As a restaurant customer, I want to browse the menu on my phone, so that I can see available food items with descriptions and prices.

#### Acceptance Criteria

1. WHEN the Customer_App loads, THE Menu_Service SHALL retrieve all active menu items from the Database
2. THE Customer_App SHALL display menu items organized by categories
3. THE Customer_App SHALL display each menu item with name, description, price, and photo
4. WHEN a customer selects a category, THE Customer_App SHALL filter and display only items in that category
5. THE Customer_App SHALL display menu items in the selected Language_Preference

### Requirement 3: Bilingual Menu Support

**User Story:** As a restaurant customer, I want to switch between English and Amharic, so that I can read the menu in my preferred language.

#### Acceptance Criteria

1. THE Customer_App SHALL provide a language toggle between English and Amharic
2. WHEN a customer changes Language_Preference, THE Customer_App SHALL update all menu item names and descriptions within 500ms
3. THE Menu_Service SHALL store menu item names and descriptions in both English and Amharic
4. THE Customer_App SHALL persist the Language_Preference selection for the current session
5. THE Customer_App SHALL default to English if no Language_Preference is set

### Requirement 4: Order Placement

**User Story:** As a restaurant customer, I want to place an order from my phone, so that I can order food without calling a waiter.

#### Acceptance Criteria

1. THE Customer_App SHALL allow customers to add menu items to a cart
2. THE Customer_App SHALL allow customers to specify quantity for each menu item
3. WHEN a customer submits an order, THE Order_Manager SHALL create an order record with table number, items, quantities, and timestamp
4. WHEN a customer submits an order, THE Order_Manager SHALL set the Order_Status to Placed
5. WHEN an order is created, THE Order_Manager SHALL store the order in the Database within 1 second
6. WHEN an order is created, THE Notification_Service SHALL send a notification to the Admin_Panel within 2 seconds
7. THE Customer_App SHALL display an order confirmation with order details after successful submission

### Requirement 5: Real-Time Order Status Tracking

**User Story:** As a restaurant customer, I want to track my order status in real-time, so that I know when my food is being prepared and ready.

#### Acceptance Criteria

1. WHEN an order is placed, THE Customer_App SHALL display the current Order_Status
2. WHEN the Order_Status changes, THE Customer_App SHALL update the displayed status within 3 seconds
3. THE Customer_App SHALL subscribe to Real_Time_Subscription for order status updates
4. THE Customer_App SHALL display Order_Status progression (Placed → Preparing → Ready → Served)
5. THE Customer_App SHALL use visual indicators (icons or colors) to represent each Order_Status

### Requirement 6: Kitchen Order Display

**User Story:** As a kitchen staff member, I want to see all incoming orders on a dedicated screen, so that I can prepare orders efficiently.

#### Acceptance Criteria

1. THE Kitchen_Display SHALL retrieve all orders with Order_Status of Placed or Preparing from the Database
2. THE Kitchen_Display SHALL display each order with table number, items, quantities, and timestamp
3. WHEN a new order is created, THE Kitchen_Display SHALL display the new order within 3 seconds
4. THE Kitchen_Display SHALL subscribe to Real_Time_Subscription for new orders
5. THE Kitchen_Display SHALL sort orders by timestamp with oldest orders first
6. THE Kitchen_Display SHALL visually distinguish between Placed and Preparing orders

### Requirement 7: Kitchen Order Status Management

**User Story:** As a kitchen staff member, I want to update order status, so that customers and staff know the progress of each order.

#### Acceptance Criteria

1. THE Kitchen_Display SHALL provide controls to change Order_Status from Placed to Preparing
2. THE Kitchen_Display SHALL provide controls to change Order_Status from Preparing to Ready
3. WHEN kitchen staff updates Order_Status, THE Order_Manager SHALL update the order record in the Database within 1 second
4. WHEN Order_Status is updated, THE Order_Manager SHALL trigger Real_Time_Subscription notifications
5. THE Kitchen_Display SHALL remove orders from the display when Order_Status changes to Served

### Requirement 8: Admin Order Notifications

**User Story:** As a restaurant administrator, I want to receive instant notifications when new orders arrive, so that I can monitor restaurant operations.

#### Acceptance Criteria

1. WHEN an order is created, THE Notification_Service SHALL send a notification to the Admin_Panel within 2 seconds
2. THE notification SHALL include table number and ordered items
3. THE Admin_Panel SHALL display notifications in a visible notification area
4. THE Admin_Panel SHALL subscribe to Real_Time_Subscription for new orders
5. THE Admin_Panel SHALL provide a way to mark notifications as read

### Requirement 9: Menu Management

**User Story:** As a restaurant administrator, I want to manage menu items, so that I can keep the menu up-to-date with current offerings and prices.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create new menu items with name, description, price, category, and photo in both English and Amharic
2. THE Admin_Panel SHALL allow administrators to edit existing menu item details
3. THE Admin_Panel SHALL allow administrators to delete menu items
4. THE Admin_Panel SHALL allow administrators to create and manage categories
5. WHEN an administrator saves menu changes, THE Menu_Service SHALL update the Database within 1 second
6. WHEN menu items are updated, THE Menu_Service SHALL trigger Real_Time_Subscription notifications to update active Customer_App sessions
7. THE Admin_Panel SHALL validate that price values are positive numbers
8. THE Admin_Panel SHALL validate that required fields (name in both languages, price, category) are provided

### Requirement 10: Employee Management

**User Story:** As a restaurant administrator, I want to manage employee records, so that I can track staff information, roles, and shifts.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create employee records with name, role, contact information, and shift schedule
2. THE Admin_Panel SHALL allow administrators to edit employee information
3. THE Admin_Panel SHALL allow administrators to deactivate employee accounts
4. WHEN an administrator saves employee changes, THE Employee_Service SHALL update the Database within 1 second
5. THE Admin_Panel SHALL display a list of all employees with their current status
6. THE Admin_Panel SHALL validate that required fields (name, role) are provided

### Requirement 11: Inventory Management

**User Story:** As a restaurant administrator, I want to track ingredient inventory, so that I can monitor stock levels and prevent shortages.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create inventory items with name, quantity, and unit of measurement
2. THE Admin_Panel SHALL allow administrators to update inventory quantities
3. THE Admin_Panel SHALL allow administrators to set minimum stock level thresholds for inventory items
4. WHEN inventory quantity falls below the minimum threshold, THE Inventory_Service SHALL flag the item as low stock
5. THE Admin_Panel SHALL display low stock items prominently
6. WHEN an administrator saves inventory changes, THE Inventory_Service SHALL update the Database within 1 second
7. THE Admin_Panel SHALL validate that quantity values are non-negative numbers

### Requirement 12: Admin Panel Bilingual Support

**User Story:** As a restaurant administrator, I want to use the admin panel in English or Amharic, so that I can work in my preferred language.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a language toggle between English and Amharic
2. WHEN an administrator changes Language_Preference, THE Admin_Panel SHALL update all interface text within 500ms
3. THE Admin_Panel SHALL persist the Language_Preference selection across sessions
4. THE Admin_Panel SHALL default to English if no Language_Preference is set

### Requirement 13: Authentication and Authorization

**User Story:** As a restaurant administrator, I want secure access to the admin panel and kitchen display, so that only authorized staff can access these interfaces.

#### Acceptance Criteria

1. THE Authentication_Service SHALL require username and password for Admin_Panel access
2. THE Authentication_Service SHALL require username and password for Kitchen_Display access
3. WHEN a user provides valid credentials, THE Authentication_Service SHALL create an authenticated session
4. WHEN a user provides invalid credentials, THE Authentication_Service SHALL return an error message within 1 second
5. THE Authentication_Service SHALL use Supabase authentication mechanisms
6. THE Admin_Panel SHALL restrict access to management features based on user roles
7. THE Authentication_Service SHALL maintain session state for 8 hours of inactivity

### Requirement 14: Responsive Design

**User Story:** As a user, I want the application to work on different screen sizes, so that I can use it on phones, tablets, and desktop computers.

#### Acceptance Criteria

1. THE Customer_App SHALL render correctly on mobile devices with screen widths from 320px to 480px
2. THE Customer_App SHALL render correctly on tablet devices with screen widths from 481px to 1024px
3. THE Admin_Panel SHALL render correctly on desktop screens with widths of 1025px and above
4. THE Kitchen_Display SHALL render correctly on screens with widths of 1280px and above
5. WHEN screen orientation changes, THE Customer_App SHALL adjust layout within 500ms

### Requirement 15: Data Persistence and Real-Time Synchronization

**User Story:** As a system operator, I want all data stored reliably and synchronized in real-time, so that all users see consistent and up-to-date information.

#### Acceptance Criteria

1. THE Database SHALL store all orders, menu items, employees, and inventory records persistently
2. THE Order_Manager SHALL use Real_Time_Subscription to broadcast order status changes
3. THE Menu_Service SHALL use Real_Time_Subscription to broadcast menu updates
4. WHEN a Real_Time_Subscription connection is lost, THE system SHALL attempt to reconnect within 5 seconds
5. WHEN a Real_Time_Subscription reconnects, THE system SHALL synchronize any missed updates within 3 seconds
6. THE Database SHALL enforce referential integrity between orders and menu items
7. THE Database SHALL enforce referential integrity between orders and tables

### Requirement 16: Supabase Backend Configuration

**User Story:** As a developer, I want clear guidance on configuring Supabase, so that I can set up the backend infrastructure correctly.

#### Acceptance Criteria

1. THE Database SHALL include a tables schema with columns for table_number and qr_code_url
2. THE Database SHALL include a menu_items schema with columns for id, name_en, name_am, description_en, description_am, price, category, photo_url, and is_active
3. THE Database SHALL include an orders schema with columns for id, table_number, items (JSONB), total_price, status, and created_at
4. THE Database SHALL include an order_items schema with columns for id, order_id, menu_item_id, quantity, and price_snapshot
5. THE Database SHALL include an employees schema with columns for id, name, role, contact_info, shift_schedule, and is_active
6. THE Database SHALL include an inventory schema with columns for id, item_name, quantity, unit, minimum_threshold, and last_updated
7. THE Database SHALL include a categories schema with columns for id, name_en, and name_am
8. THE Authentication_Service SHALL configure Supabase Row Level Security policies for each table
9. THE Database SHALL configure Real_Time_Subscription for orders, menu_items, and inventory tables
10. THE Database SHALL create indexes on frequently queried columns (table_number, order status, menu_item category)
