#!/bin/zsh

# Script to combine all .md, .ts, and .js files into llm.md
# Usage: ./combine-codebase.sh

OUTPUT_FILE="llm.md"

echo "Scanning for files..."

# Use zsh array from command substitution - much cleaner!
# Use */pattern/* to match directories anywhere in the path, not just top-level
files=($(find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.js" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" \
    -not -path "*/coverage/*" \
    -not -path "*/.next/*" \
    -not -path "*/.svelte-kit/*" \
    -not -path "*/out/*" \
    -not -path "*/target/*" \
    -not -path "*/.cache/*" \
    -not -path "*/tmp/*" \
    -not -path "*/temp/*" \
    -not -path "*/.vite/*" \
    -not -path "*/deps/*" \
    -not -name "$OUTPUT_FILE" \
    -not -name "CHANGELOG.md" \
    -not -iname "changelog.md" \
    -not -path "./readme.md" \
    -not -path "./README.md" \
    | sort))

echo "Found ${#files[@]} files to process"

# If no files found, exit
if [[ ${#files[@]} -eq 0 ]]; then
    echo "No files found!"
    exit 1
fi

# Show first few files for confirmation
echo "First few files:"
for i in {1..5}; do
    [[ $i -le ${#files[@]} ]] && echo "$files[$i]"
done
if [[ ${#files[@]} -gt 5 ]]; then
    echo "... and $((${#files[@]} - 5)) more"
fi

echo ""

# Store all content in memory first
content=""
file_count=0
skipped_count=0

# Add header
content+="# Codebase Contents"$'\n'
content+=""$'\n'
content+="Generated on: $(date)"$'\n'
content+=""$'\n'

echo "Processing files..."

# Process each file using zsh array iteration
for file in $files[@]; do
    # Skip if file is not readable
    if [[ ! -r "$file" ]]; then
        echo "Warning: Cannot read $file, skipping..."
        ((skipped_count++))
        continue
    fi
    
    # Get file size
    file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || wc -c < "$file")
    
    # Skip large files (> 500KB)
    if [[ $file_size -gt 512000 ]]; then
        echo "Warning: $file is too large ($((file_size / 1024))KB), skipping..."
        ((skipped_count++))
        continue
    fi
    
    # Check if file appears to be binary - improved detection
    if file "$file" | grep -q "binary\|executable\|compressed" 2>/dev/null; then
        echo "Warning: $file appears to be binary, skipping..."
        ((skipped_count++))
        continue
    fi
    
    # Additional check for minified JS (very long lines typically indicate minification)
    if [[ ${file:e} == "js" ]]; then
        max_line_length=$(awk 'length > max_length { max_length = length } END { print max_length+0 }' "$file" 2>/dev/null || echo 0)
        if [[ $max_line_length -gt 1000 ]]; then
            echo "Warning: $file appears to be minified (line length: $max_line_length), skipping..."
            ((skipped_count++))
            continue
        fi
    fi
    
    ((file_count++))
    echo "Processing ($file_count/${#files[@]}): $file"
    
    # Determine language for syntax highlighting using zsh parameter expansion
    case ${file:e} in
        "md")
            lang="markdown"
            ;;
        "ts")
            lang="typescript"
            ;;
        "js")
            lang="javascript"
            ;;
        *)
            lang="text"
            ;;
    esac
    
    # Append file content to memory
    content+="## File: \`$file\`"$'\n'
    content+=""$'\n'
    content+="\`\`\`$lang"$'\n'
    content+="$(<$file)"$'\n'  # zsh's nice file reading syntax
    content+="\`\`\`"$'\n'
    content+=""$'\n'
    content+="---"$'\n'
    content+=""$'\n'
    
    # Progress indicator
    if (( file_count % 10 == 0 )); then
        echo "Processed $file_count files so far..."
    fi
done

# Add summary to content
content+=""$'\n'
content+="## Summary"$'\n'
content+=""$'\n'
content+="Total files processed: $file_count"$'\n'
content+="Files skipped: $skipped_count"$'\n'
content+="Generated on: $(date)"$'\n'

# Now write everything to file at once
echo "Writing to $OUTPUT_FILE..."
print -r -- "$content" > "$OUTPUT_FILE"

echo ""
echo "Done! Combined $file_count files into $OUTPUT_FILE"
echo "Files skipped: $skipped_count"
if [[ -f "$OUTPUT_FILE" ]]; then
    echo "Output file size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}' 2>/dev/null || echo 'unknown')"
fi