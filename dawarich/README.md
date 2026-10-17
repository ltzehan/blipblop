# Dawarich

Enter Rails console:
```bash
bin/rails console
```

Some useful Rails console commands:
```ruby
# Delete places suggested by reverse geocoding
Place.where.not(source: :manual).destroy_all

# Delete suggested visits
Visit.where.not(status: :confirmed).destroy_all

# Resuggest visits
user = User.find_by(email: 'ltzehan13@gmail.com')
VisitSuggestingJob.perform_now(user_id: user.id, start_at: 30.days.ago, end_at: Time.current)
```

