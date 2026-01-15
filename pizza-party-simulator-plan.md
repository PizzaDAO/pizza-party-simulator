# Pizza Party Simulator - Game Design Document

## Core Game Concept
A management/simulation game where players host a pizza party and need to keep guests happy by managing resources, entertainment, and facilities.

## Key Game Systems

### 1. Guest Management
- **Guest Types**: Different personality types (chatty, shy, foodie, party animal)
- **Needs System**: Each guest has meters for:
  - Hunger (satisfied by pizza)
  - Thirst (satisfied by drinks)
  - Bladder (need to use bathroom)
  - Social interaction (talking with others)
  - Entertainment (activities/installations)
  - Cleanliness (affected by trash around them)
- **Arrival/Departure**: Guests arrive over time, leave when satisfied or frustrated

### 2. Pizza & Drink Management
- **Pizza Mechanics**:
  - Order/make pizzas (time delay)
  - Different types/preferences (pepperoni, veggie, vegan, gluten free, dairy free, etc.)
  - Pizza temperature (fresh vs cold)
  - Running out = unhappy guests
- **Drink Station**:
  - Refillable drinks
  - Variety (soda, juice, water, alcoholic beverages)
  - Managing ice/supplies
- **Bartender System**:
  - Hire and train bartenders
  - Training levels affect drunk guest prevention
  - Trained bartenders refuse to serve guests who've had >= 3 drinks
  - Untrained bartenders may over-serve, leading to drunk guests
- **Drunk Guests**:
  - Become disruptive, may upset other guests
  - Move erratically, harder to satisfy
  - Can cause problems at the party

### 3. Bathroom System
- **Bathroom Needs**:
  - Guests' bladder meters fill over time (faster with more drinks)
  - Must find and use bathroom before meter fills
- **Signage Importance**:
  - Clear signage helps guests find bathrooms quickly
  - Poor signage = frustrated guests wandering
  - Bathroom location and visibility matters
- **Consequences**: Guests become very unhappy if they can't find bathroom in time

### 4. Cleanliness & Trash Management
- **Guest Behavior**:
  - Guests generate trash (plates, cups, napkins)
  - Will throw trash in trash cans if they see one nearby
  - Otherwise, trash placement follows this priority:
    1. **Tables** (most likely) - if standing/sitting near a table
    2. **Bar** (second choice) - if near the bar area
    3. **Floor** (last resort) - if no tables or bar nearby
  - Guest proximity and available surfaces determine where trash ends up
- **Trash Can Placement**:
  - Strategic placement encourages proper disposal
  - Visibility and accessibility matter
  - Well-placed trash cans reduce cleaning staff workload
- **Cleanliness Impact**:
  - Accumulated trash reduces guest satisfaction
  - Messy areas discourage socializing
  - Tables fill up faster than floors in typical scenarios
  - Bar areas can become cluttered quickly during heavy drinking periods

### 5. Social Interaction System
- **Conversation Mechanics**:
  - Guests naturally gravitate toward compatible personalities
  - Player can introduce guests to each other
  - Conversation groups form and dissolve
  - Social compatibility affects satisfaction
- **Seating/Space**: Layout matters for encouraging mingling

### 6. Entertainment & Activities
- **Installations**:
  - Arcade machines
  - Photo booth
  - Music/DJ booth
  -   you often have to ask the dj to turn down the music
  - Board games area
  - TV/sports viewing
- **Management**: Keep activities engaging, prevent boredom

### 7. Staff Management
- **Bartenders**:
  - Training system (levels 1-5)
  - Higher training = better drunk guest prevention
  - Cost to hire and train
- **Cleaning Staff**:
  - Essential for maintaining party cleanliness
  - Three types of cleaning tasks:
    - **Empty trash cans**: Fastest task, prevents overflow
    - **Clean tables**: Medium speed, keeps dining areas presentable
    - **Clean floor trash**: Slowest task, most labor-intensive
  - Staff efficiency and number affects how quickly messes are handled
  - Can prioritize tasks or work autonomously
  - Cost to hire, potential training to improve speed
  - Must balance number of cleaners with party size and guest messiness
- **Potential Other Staff**:
  - Pizza makers (for faster service)
  - Party hosts (for facilitating social interactions)
  - Security (for handling disruptive drunk guests)

## Success Metrics
- **Party Rating**: Overall success score based on:
  - Guest satisfaction when leaving
  - Number of guests who stayed the whole party
  - Social connections made
  - No one went hungry/thirsty
  - Bathroom accessibility
  - Cleanliness maintained
  - No disruptive drunk guests
- **Challenge Modes**: Different scenarios (birthday party, corporate event, kids party)

## Gameplay Loop
1. Prepare party space (place installations, stock supplies, position trash cans, add signage)
2. Hire and train staff (bartenders, cleaners)
3. Guests arrive gradually
4. Monitor guest needs: order pizza, manage drinks, watch for bathroom needs
5. Manage trash accumulation and cleanliness
6. Prevent over-serving of alcohol
7. Facilitate social interactions
8. Manage entertainment rotation
9. Party ends, receive rating/feedback

## Key Player Decisions
- **Layout Planning**: Where to place bathrooms, trash cans, activities, food stations
- **Signage Strategy**: How much and where to guide guests
- **Staff Investment**: Balance between bartenders vs cleaners, training vs quantity
- **Cleaning Strategy**: Number of trash cans vs number of cleaning staff to handle mess
- **Resource Management**: Balance pizza orders, drink variety, trash can placement
- **Guest Flow**: Design space to encourage good circulation and socializing

## Potential Challenge Scenarios
- **Kids Birthday Party**: No alcohol, high energy, need more entertainment
- **Corporate Event**: Professional atmosphere, moderate drinking, networking focus
- **College Party**: High alcohol consumption risk, messy guests, social chaos
- **Family Reunion**: Multi-generational, diverse needs, long duration
- **Small Intimate Gathering**: Quality over quantity, personal attention matters
