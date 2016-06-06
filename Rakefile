task default: %w[preview]

desc 'Previews the site'
task :preview do
  sh 'bundle exec jekyll serve --baseurl "" --livereload'
end

desc 'Previews the drafts'
task :drafts do
  sh 'bundle exec jekyll serve --baseurl "" --livereload --drafts'
end

desc 'Cleans the built site files'
task :clean do
  sh 'rm -rf _site'
end
