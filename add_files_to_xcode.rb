require 'xcodeproj'

project_path = 'ios/AskKodaAI/AskKodaAI.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Add to the AskKodaAI app target
target = project.targets.find { |t| t.name == 'AskKodaAI' }

# Find the main group "AskKodaAI" (the inner folder)
main_group = project.main_group.find_subpath('AskKodaAI')

# Add push-ups.mp4
video_path = 'ios/AskKodaAI/AskKodaAI/push-ups.mp4'
if !main_group.files.find { |f| f.path == 'push-ups.mp4' }
  file_ref = main_group.new_file('push-ups.mp4')
  target.resources_build_phase.add_file_reference(file_ref, true)
  puts "Added push-ups.mp4"
end

# Find Models group and add ExerciseImages.swift
models_group = main_group.find_subpath('Models')
if models_group && !models_group.files.find { |f| f.path == 'ExerciseImages.swift' }
  swift_ref = models_group.new_file('ExerciseImages.swift')
  target.source_build_phase.add_file_reference(swift_ref, true)
  puts "Added ExerciseImages.swift"
end

project.save
puts "Saved Xcode project"
